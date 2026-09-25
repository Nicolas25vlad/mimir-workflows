import { spawn } from 'node:child_process';
import { mkdtemp, readdir, readFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative, sep } from 'node:path';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export interface ScannerLimits {
  timeoutMs: number;
  gitDepth: number;
  maxFiles: number;
  maxFileBytes: number;
  maxTotalBytes: number;
  githubToken?: string;
}

export interface Finding {
  rule: string;
  category: 'bug-risk' | 'security' | 'debt' | 'configuration';
  severity: Severity;
  path: string;
  line: number;
  message: string;
  evidence?: string;
}

interface InventoryFile {
  path: string;
  bytes: number;
  extension: string;
}

interface FileMetric {
  path: string;
  bytes: number;
  lines: number;
  language: string;
}

const EXCLUDED_DIRECTORIES = new Set([
  '.git',
  '.idea',
  '.vscode',
  '.next',
  '.nuxt',
  '.venv',
  'venv',
  'node_modules',
  'vendor',
  'dist',
  'build',
  'coverage',
  'target',
  'out',
  '.gradle',
  '.terraform',
  '__pycache__'
]);

const EXCLUDED_FILE_SUFFIXES = [
  '.lock',
  '.min.js',
  '.min.css',
  '.map',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.ico',
  '.pdf',
  '.zip',
  '.gz',
  '.jar',
  '.war',
  '.woff',
  '.woff2',
  '.ttf'
];

const LANGUAGE_BY_EXTENSION: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.mjs': 'JavaScript',
  '.cjs': 'JavaScript',
  '.py': 'Python',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.kts': 'Kotlin',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.cs': 'C#',
  '.c': 'C',
  '.h': 'C/C++',
  '.cpp': 'C++',
  '.hpp': 'C++',
  '.sh': 'Shell',
  '.fish': 'Fish',
  '.sql': 'SQL',
  '.yml': 'YAML',
  '.yaml': 'YAML',
  '.json': 'JSON',
  '.toml': 'TOML',
  '.xml': 'XML',
  '.gradle': 'Gradle',
  '.md': 'Markdown'
};

const KEY_FILE_NAMES = new Set([
  'package.json',
  'pyproject.toml',
  'requirements.txt',
  'go.mod',
  'cargo.toml',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'settings.gradle',
  'settings.gradle.kts',
  'dockerfile',
  'compose.yml',
  'compose.yaml',
  'docker-compose.yml',
  'docker-compose.yaml',
  'readme.md',
  'makefile',
  'justfile'
]);

const SECRET_ASSIGNMENT =
  /\b(password|passwd|secret|api[_-]?key|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["'][^"'\n]{12,}["']/i;

const RULES: Array<{
  rule: string;
  category: Finding['category'];
  severity: Severity;
  pattern: RegExp;
  message: string;
  redactEvidence?: boolean;
}> = [
  {
    rule: 'todo-marker',
    category: 'debt',
    severity: 'low',
    pattern: /\b(TODO|FIXME|HACK|XXX)\b/i,
    message: 'Unresolved engineering marker found.'
  },
  {
    rule: 'dynamic-eval',
    category: 'security',
    severity: 'high',
    pattern: /\beval\s*\(/,
    message: 'Dynamic eval can execute attacker-controlled code.'
  },
  {
    rule: 'python-os-system',
    category: 'security',
    severity: 'high',
    pattern: /\bos\.system\s*\(/,
    message: 'os.system executes through a shell and is easy to misuse with untrusted input.'
  },
  {
    rule: 'python-shell-true',
    category: 'security',
    severity: 'high',
    pattern: /\bsubprocess\b.*\bshell\s*=\s*True\b/,
    message: 'subprocess with shell=True increases command-injection risk.'
  },
  {
    rule: 'tls-verification-disabled',
    category: 'security',
    severity: 'high',
    pattern: /(rejectUnauthorized\s*:\s*false|verify\s*=\s*False|NODE_TLS_REJECT_UNAUTHORIZED\s*=\s*["']?0)/,
    message: 'TLS certificate verification appears to be disabled.'
  },
  {
    rule: 'empty-catch',
    category: 'bug-risk',
    severity: 'medium',
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    message: 'Empty catch block can silently hide failures.'
  },
  {
    rule: 'python-bare-except-pass',
    category: 'bug-risk',
    severity: 'medium',
    pattern: /except\s*:\s*pass\b/,
    message: 'Bare except with pass can silently hide unrelated failures.'
  },
  {
    rule: 'hardcoded-secret-like',
    category: 'security',
    severity: 'high',
    pattern: SECRET_ASSIGNMENT,
    message: 'A secret-like value appears to be hardcoded.',
    redactEvidence: true
  }
];

export function parseGitHubRepository(value: string): { owner: string; name: string } {
  const trimmed = value.trim();

  const shorthand = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (shorthand) {
    return { owner: shorthand[1]!, name: shorthand[2]!.replace(/\.git$/, '') };
  }

  const https = trimmed.match(
    /^https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?\/?$/
  );
  if (https) {
    return { owner: https[1]!, name: https[2]! };
  }

  const ssh = trimmed.match(/^git@github\.com:([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/);
  if (ssh) {
    return { owner: ssh[1]!, name: ssh[2]! };
  }

  throw new Error(
    'repository must be owner/name or a github.com HTTPS/SSH repository URL; arbitrary clone URLs are not accepted'
  );
}

function validateRef(ref: string): string {
  const value = ref.trim();

  if (!value || value.startsWith('-') || /[\0\r\n]/.test(value) || value.length > 240) {
    throw new Error('invalid Git ref');
  }

  return value;
}

function gitEnvironment(token?: string): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    GIT_TERMINAL_PROMPT: '0',
    GCM_INTERACTIVE: 'never'
  };

  if (token) {
    env.GIT_CONFIG_COUNT = '1';
    env.GIT_CONFIG_KEY_0 = 'http.extraHeader';
    env.GIT_CONFIG_VALUE_0 =
      'Authorization: Basic ' + Buffer.from(`x-access-token:${token}`).toString('base64');
  }

  return env;
}

async function run(
  command: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
  env: NodeJS.ProcessEnv = process.env
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    const maxOutput = 64 * 1024;

    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < maxOutput) stdout += chunk.toString('utf8');
    });

    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < maxOutput) stderr += chunk.toString('utf8');
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      reject(new Error(`${command} timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.on('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });

    child.on('close', (code) => {
      clearTimeout(timer);

      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(
        new Error(
          `${command} exited with code ${code}: ${stderr.trim().slice(0, 1000) || 'no stderr'}`
        )
      );
    });
  });
}

async function inventory(root: string): Promise<InventoryFile[]> {
  const files: InventoryFile[] = [];
  const stack = [root];
  const maxInventoryFiles = 10000;

  while (stack.length > 0 && files.length < maxInventoryFiles) {
    const current = stack.pop()!;
    const entries = await readdir(current, { withFileTypes: true });

    for (const entry of entries) {
      if (files.length >= maxInventoryFiles) break;

      const absolute = join(current, entry.name);
      const relativePath = relative(root, absolute).split(sep).join('/');

      if (entry.isSymbolicLink()) continue;

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) stack.push(absolute);
        continue;
      }

      if (!entry.isFile()) continue;

      const lower = entry.name.toLowerCase();
      if (EXCLUDED_FILE_SUFFIXES.some((suffix) => lower.endsWith(suffix))) continue;

      const fileStat = await stat(absolute);
      files.push({
        path: relativePath,
        bytes: fileStat.size,
        extension: extname(entry.name).toLowerCase()
      });
    }
  }

  return files;
}

function languageFor(file: InventoryFile): string {
  const name = basename(file.path).toLowerCase();
  if (name === 'dockerfile') return 'Dockerfile';
  return LANGUAGE_BY_EXTENSION[file.extension] ?? 'Other';
}

function priorityFor(file: InventoryFile, hotspotTouches: number): number {
  const name = basename(file.path).toLowerCase();
  let score = 0;

  if (KEY_FILE_NAMES.has(name)) score += 1000;
  if (LANGUAGE_BY_EXTENSION[file.extension]) score += 250;
  score += Math.min(hotspotTouches, 50) * 20;
  score += Math.max(0, 200 - Math.floor(file.bytes / 1024));

  return score;
}

function redactLine(line: string): string {
  if (SECRET_ASSIGNMENT.test(line)) return '[redacted suspicious secret-like assignment]';

  return line
    .replace(/(authorization\s*[:=]\s*["']?bearer\s+)[^"'\s]+/gi, '$1[redacted]')
    .replace(/(https?:\/\/[^\s/:]+:)[^@\s]+@/gi, '$1[redacted]@')
    .trim()
    .slice(0, 220);
}

export function scanText(path: string, text: string): Finding[] {
  const findings: Finding[] = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]!;

    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(line)) continue;

      findings.push({
        rule: rule.rule,
        category: rule.category,
        severity: rule.severity,
        path,
        line: index + 1,
        message: rule.message,
        evidence: rule.redactEvidence ? '[redacted]' : redactLine(line)
      });

      if (findings.length >= 40) return findings;
    }
  }

  return findings;
}

function safeExcerpt(text: string, limit = 5000): string {
  return text
    .split(/\r?\n/)
    .slice(0, 140)
    .map(redactLine)
    .join('\n')
    .slice(0, limit);
}

function countHotspots(raw: string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const line of raw.split(/\r?\n/)) {
    const path = line.trim();
    if (!path || path.startsWith('.git/')) continue;
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }

  return counts;
}

function recentCommits(raw: string): Array<{ sha: string; date: string; subject: string }> {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(0, 20)
    .map((line) => {
      const [sha = '', date = '', ...subjectParts] = line.split('\t');
      return {
        sha,
        date,
        subject: subjectParts.join('\t').slice(0, 180)
      };
    });
}

export async function scanRepository(
  repositoryInput: string,
  refInput: string,
  limits: ScannerLimits
): Promise<Record<string, unknown>> {
  const repository = parseGitHubRepository(repositoryInput);
  const ref = validateRef(refInput);
  const root = await mkdtemp(join(tmpdir(), 'mimir-scan-'));

  try {
    await run('git', ['init', '--quiet'], root, limits.timeoutMs);
    await run(
      'git',
      ['remote', 'add', 'origin', `https://github.com/${repository.owner}/${repository.name}.git`],
      root,
      limits.timeoutMs
    );
    await run(
      'git',
      ['fetch', '--quiet', '--depth', String(limits.gitDepth), 'origin', ref],
      root,
      limits.timeoutMs,
      gitEnvironment(limits.githubToken)
    );
    await run('git', ['checkout', '--quiet', '--detach', 'FETCH_HEAD'], root, limits.timeoutMs);

    const [commit, hotspotRaw, commitsRaw] = await Promise.all([
      run('git', ['rev-parse', 'HEAD'], root, limits.timeoutMs),
      run('git', ['log', '-n', '100', '--name-only', '--format='], root, limits.timeoutMs),
      run(
        'git',
        ['log', '-n', '20', '--format=%H%x09%ad%x09%s', '--date=iso-strict'],
        root,
        limits.timeoutMs
      )
    ]);

    const allFiles = await inventory(root);
    const hotspotMap = countHotspots(hotspotRaw);

    const selected = [...allFiles]
      .filter((file) => file.bytes <= limits.maxFileBytes)
      .sort(
        (a, b) =>
          priorityFor(b, hotspotMap.get(b.path) ?? 0) -
          priorityFor(a, hotspotMap.get(a.path) ?? 0)
      );

    let totalBytes = 0;
    const metrics: FileMetric[] = [];
    const findings: Finding[] = [];
    const keyFiles: Array<{ path: string; excerpt: string }> = [];

    for (const file of selected) {
      if (metrics.length >= limits.maxFiles) break;
      if (totalBytes + file.bytes > limits.maxTotalBytes) continue;

      const absolute = join(root, ...file.path.split('/'));
      const buffer = await readFile(absolute);
      if (buffer.includes(0)) continue;

      const text = buffer.toString('utf8');
      totalBytes += buffer.byteLength;

      const metric: FileMetric = {
        path: file.path,
        bytes: file.bytes,
        lines: text.split(/\r?\n/).length,
        language: languageFor(file)
      };

      metrics.push(metric);

      if (findings.length < 200) {
        findings.push(...scanText(file.path, text).slice(0, 200 - findings.length));
      }

      if (keyFiles.length < 10 && KEY_FILE_NAMES.has(basename(file.path).toLowerCase())) {
        keyFiles.push({
          path: file.path,
          excerpt: safeExcerpt(text)
        });
      }
    }

    const languages = Object.entries(
      metrics.reduce<Record<string, { files: number; bytes: number }>>((acc, file) => {
        const current = acc[file.language] ?? { files: 0, bytes: 0 };
        current.files += 1;
        current.bytes += file.bytes;
        acc[file.language] = current;
        return acc;
      }, {})
    )
      .map(([language, stats]) => ({ language, ...stats }))
      .sort((a, b) => b.bytes - a.bytes);

    const hotspots = [...hotspotMap.entries()]
      .map(([path, touches]) => ({ path, touches }))
      .sort((a, b) => b.touches - a.touches)
      .slice(0, 25);

    const largestFiles = [...metrics]
      .sort((a, b) => b.lines - a.lines)
      .slice(0, 25)
      .map(({ path, lines, bytes, language }) => ({ path, lines, bytes, language }));

    const findingSummary = findings.reduce<Record<Severity, number>>(
      (acc, finding) => {
        acc[finding.severity] += 1;
        return acc;
      },
      { low: 0, medium: 0, high: 0, critical: 0 }
    );

    return {
      scanner_version: 1,
      repository: `${repository.owner}/${repository.name}`,
      requested_ref: ref,
      commit,
      inventory: {
        discovered_files: allFiles.length,
        analyzed_files: metrics.length,
        analyzed_bytes: totalBytes,
        truncated:
          metrics.length < selected.length ||
          selected.some((file) => file.bytes > limits.maxFileBytes)
      },
      languages,
      recent_commits: recentCommits(commitsRaw),
      hotspots,
      largest_files: largestFiles,
      findings_summary: findingSummary,
      findings,
      key_files: keyFiles
    };
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
