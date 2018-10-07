// @flow

import md5 from "md5";
import { Buffer } from "buffer";

function cut(data: Buffer, size: number): Buffer[] {
  const numChunks = Math.ceil(data.length / size);
  const chunks = new Array(numChunks);
  for (let i = 0, o = 0; i < numChunks; ++i, o += size) {
    chunks[i] = data.slice(o, o + size);
  }
  return chunks;
}

/**
 * export data into a chunk of string that you can generate a QR with
 * @param data the complete data to encode in a series of QR code frames
 * @param dataSize the number of bytes to use from data for each frame
 * @param replicas (>= 1) the total number of loops to repeat the frames with varying a nonce. More there is, better the chance to not be stuck on a frame. Experience has shown some QR Code are harder to read.
 *
 * the data is prepend in the frames with this head:
 * 4 bytes: uint, data length
 * 16 bytes: md5 of data
 *
 * each frame is a base64 of:
 *   1 byte: nonce
 *   2 bytes: uint, total number of frames
 *   2 bytes: uint, index of frame
 *   variable data
 *
 */
export function dataToFrames(
  dataOrStr: Buffer,
  dataSize: number = 120,
  replicas: number = 1
): string[] {
  const data = Buffer.from(dataOrStr);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const md5Buffer = Buffer.from(md5(data), "hex");
  const all = Buffer.concat([lengthBuffer, md5Buffer, data]);
  const dataChunks = cut(all, dataSize);
  const r = [];
  for (let nonce = 0; nonce < replicas; nonce++) {
    for (let i = 0; i < dataChunks.length; i++) {
      const head = Buffer.alloc(5);
      head.writeUInt8(nonce, 0);
      head.writeUInt16BE(dataChunks.length, 1);
      head.writeUInt16BE(i, 3);
      r.push(Buffer.concat([head, dataChunks[i]]).toString("base64"));
    }
  }
  return r;
}
