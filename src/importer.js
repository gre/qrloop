// @flow

import md5 from "md5";
import { Buffer } from "buffer";
import { MAX_REPLICAS } from "./constants";

type Frame = {
  framesCount: number,
  index: number,
  data: Buffer
};

export type State = ?(Frame[]);

/**
 * reduce frames data array to add on more chunk to it.
 * As a user of this function, consider the frames to be a black box and use the available functions to extract things.
 */
export function parseFramesReducer(state: State, chunkStr: string): State {
  const frames = state || [];
  const chunk = Buffer.from(chunkStr, "base64");
  const head = chunk.slice(0, 5);
  const version = head.readUInt8(0);
  if (version >= MAX_REPLICAS) {
    throw new Error("version " + version + " not supported");
  }
  const framesCount = head.readUInt16BE(1);
  const index = head.readUInt16BE(3);
  const data = chunk.slice(5);
  if (framesCount <= 0) {
    throw new Error("invalid framesCount");
  }
  if (index < 0 || index >= framesCount) {
    throw new Error("invalid index");
  }

  return (
    frames
      // override frame by index and also make sure all frames have same framesCount. this allows to not be stucked and recover any scenario.
      .filter(c => c.index !== index && c.framesCount === framesCount)
      .concat({ framesCount, index, data })
  );
}

/**
 * retrieve the total number of frames
 */
export const totalNumberOfFrames = (frames: State): ?number =>
  frames && frames.length > 0 ? frames[0].framesCount : null;

/**
 * get the currently captured number of frames
 */
export const currentNumberOfFrames = (frames: State): number =>
  frames ? frames.length : 0;

/**
 * get a progress value from 0 to 1
 */
export const progressOfFrames = (frames: State): number => {
  const total = totalNumberOfFrames(frames);
  if (!total) return 0;
  return currentNumberOfFrames(frames) / total;
};

/**
 * check if the frames have all been retrieved
 */
export const areFramesComplete = (frames: State): boolean =>
  totalNumberOfFrames(frames) === currentNumberOfFrames(frames);

/**
 * return final result of the frames. assuming you have checked `areFramesComplete`
 */
export function framesToData(frames: State): Buffer {
  if (!frames) {
    throw new Error("invalid date: frames is undefined");
  }
  const all = Buffer.concat(
    frames
      .slice(0)
      .sort((a, b) => a.index - b.index)
      .map(frame => frame.data)
  );

  const length = all.readUInt32BE(all, 0);
  const expectedMD5 = all.slice(4, 20).toString("hex");
  const data = all.slice(20).slice(0, length);

  if (md5(data) !== expectedMD5) {
    throw new Error("invalid data: md5 doesn't match");
  }

  return data;
}
