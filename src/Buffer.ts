import { Buffer } from "buffer";

export function cutAndPad(data: Buffer, size: number): Buffer[] {
  const numChunks = Math.ceil(data.length / size);
  const chunks = new Array(numChunks);
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = data.slice(o, o + size);
  }
  const last = numChunks - 1;
  const pad = size - chunks[last].length;
  if (pad > 0) {
    chunks[last] = Buffer.concat([
      chunks[last],
      Buffer.from(Array(pad).fill(0)),
    ]);
  }
  return chunks;
}

export function xor(buffers: Buffer[]): Buffer {
  const result = Buffer.from(buffers[0]);
  for (let i = 1; i < buffers.length; ++i) {
    const buffer = buffers[i];
    for (let j = 0; j < buffer.length; ++j) {
      result[j] ^= buffer[j];
    }
  }
  return result;
}
