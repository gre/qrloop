// @flow

import md5 from "md5";
import { Buffer } from "buffer";
import { cutAndPad, xor } from "./Buffer";
import { MAX_NONCE, FOUNTAIN_V1 } from "./constants";

export function makeFountainFrame(
  dataChunks: typeof Buffer[],
  selectedFrameIndexes: number[]
): string {
  const k = selectedFrameIndexes.length;
  const head = Buffer.alloc(3 + 2 * k);
  head.writeUInt8(FOUNTAIN_V1, 0);
  head.writeUInt16BE(k, 1);
  const selectedFramesData = [];
  for (let j = 0; j < k; j++) {
    const frameIndex = selectedFrameIndexes[j];
    selectedFramesData.push(dataChunks[frameIndex]);
    head.writeUInt16BE(frameIndex, 3 + 2 * j);
  }
  const data = xor(selectedFramesData);
  return Buffer.concat([head, data]).toString("base64");
}

export function makeDataFrame({
  data,
  nonce,
  totalFrames,
  frameIndex,
}: {
  data: typeof Buffer,
  nonce: number,
  totalFrames: number,
  frameIndex: number,
}): string {
  const head = Buffer.alloc(5);
  head.writeUInt8(nonce, 0);
  head.writeUInt16BE(totalFrames, 1);
  head.writeUInt16BE(frameIndex, 3);
  return Buffer.concat([head, data]).toString("base64");
}

export function wrapData(data: typeof Buffer): typeof Buffer {
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32BE(data.length, 0);
  const md5Buffer = Buffer.from(md5(data), "hex");
  return Buffer.concat([lengthBuffer, md5Buffer, data]);
}

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
  wrappedData: typeof Buffer,
  dataSize: number,
  index: number,
  random: () => number
): string[] {
  const nonce = index % MAX_NONCE;
  const dataChunks = cutAndPad(wrappedData, dataSize);
  const fountains = [];
  if (dataChunks.length > 2) {
    // TODO optimal number fcount and k still need to be determined
    const fcount = Math.floor(dataChunks.length / 6);
    const k = Math.ceil(dataChunks.length / 2);
    for (let i = 0; i < fcount; i++) {
      const distribution = Array(dataChunks.length)
        .fill(null)
        .map((_, i) => ({ i, n: random() }))
        .sort((a, b) => a.n - b.n)
        .slice(0, k)
        .map((o) => o.i);
      fountains.push(makeFountainFrame(dataChunks, distribution));
    }
  }
  const result = [];
  let j = 0;
  const fountainEach = Math.floor(dataChunks.length / fountains.length);
  for (let i = 0; i < dataChunks.length; i++) {
    result.push(
      makeDataFrame({
        data: dataChunks[i],
        nonce,
        totalFrames: dataChunks.length,
        frameIndex: i,
      })
    );
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
  dataOrStr: typeof Buffer | string,
  dataSize: number = 120,
  loops: number = 1
): string[] {
  // Simple deterministic RNG
  let seed = 1;
  function random() {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
  }

  const wrappedData = wrapData(Buffer.from(dataOrStr));

  let r = [];
  for (let i = 0; i < loops; i++) {
    r = r.concat(makeLoop(wrappedData, dataSize, i, random));
  }
  return r;
}
