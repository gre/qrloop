// @flow

import md5 from "md5";
import Buffer, { cutAndPad, xor } from "./Buffer";
import { MAX_NONCE, FOUNTAIN_V1 } from "./constants";

/**
 * in one loop:
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
 * each "fountain" frame is base64 of:
 *   1 byte: fountain version
 *   2 bytes: number of K frames associated
 *   K times 2 bytes: the index of each frame
 *   variable data: the XOR of the frames data
 *
 * It inspires idea from https://en.wikipedia.org/wiki/Luby_transform_code
 */
function makeLoop(
  dataOrStr: Buffer,
  dataSize: number,
  index: number,
  random: () => number
): string[] {
  const nonce = index % MAX_NONCE;
  const data = Buffer.from(dataOrStr);
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const md5Buffer = Buffer.from(md5(data), "hex");
  const all = Buffer.concat([lengthBuffer, md5Buffer, data]);
  const dataChunks = cutAndPad(all, dataSize);
  const fountains = [];
  if (dataChunks.length > 2) {
    // TODO optimal number fcount and k still need to be determined
    const fcount = Math.floor(dataChunks.length / 6);
    const k = Math.ceil(dataChunks.length / 2);
    for (let i = 0; i < fcount; i++) {
      const selectedFramesData = [];
      const head = Buffer.alloc(3 + 2 * k);
      head.writeUInt8(FOUNTAIN_V1, 0);
      head.writeUInt16BE(k, 1);
      for (let j = 0; j < k; j++) {
        const frameIndex = Math.floor(k * random());
        selectedFramesData.push(dataChunks[frameIndex]);
        head.writeUInt16BE(frameIndex, 3 + 2 * j);
      }
      const data = xor(selectedFramesData);
      fountains.push(Buffer.concat([head, data]).toString("base64"));
    }
  }
  const result = [];
  let j = 0;
  const fountainEach = Math.floor(dataChunks.length / fountains.length);
  for (let i = 0; i < dataChunks.length; i++) {
    const head = Buffer.alloc(5);
    head.writeUInt8(nonce, 0);
    head.writeUInt16BE(dataChunks.length, 1);
    head.writeUInt16BE(i, 3);
    result.push(Buffer.concat([head, dataChunks[i]]).toString("base64"));
    if (i % fountainEach === 0 && fountains[j]) {
      result.push(fountains[j++]);
    }
  }
  return result;
}

/**
 * Export data into one series of chunk of string that you can generate a QR with
 * @param dataOrStr the complete data to encode in a series of QR code frames
 * @param dataSize the number of bytes to use from data for each frame
 * @param loops number of loops to generate. more loops increase chance for readers to read frames
 */
export function dataToFrames(
  dataOrStr: Buffer,
  dataSize: number = 120,
  loops: number = 1
): string[] {
  // Simple deterministic RNG
  let seed = 1;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  let r = [];
  for (let i = 0; i < loops; i++) {
    r = r.concat(makeLoop(dataOrStr, dataSize, i, random));
  }
  return r;
}
