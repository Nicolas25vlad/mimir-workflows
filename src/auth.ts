import { timingSafeEqual } from 'node:crypto';

export function secureTokenEquals(expected: string, received: string | undefined): boolean {
  if (!received) return false;

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  return (
    expectedBuffer.length === receivedBuffer.length &&
    timingSafeEqual(expectedBuffer, receivedBuffer)
  );
}
