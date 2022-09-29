import md5 from "md5";
import { Buffer } from "buffer";
import { xor } from "./Buffer";
import { MAX_NONCE, FOUNTAIN_V1 } from "./constants";

type Frame = {
  framesCount: number;
  index: number;
  data: Buffer;
};

type Fountain = {
  frameIndexes: number[];
  data: Buffer;
};

export type State =
  | {
      frames: Frame[];
      fountainsQueue: Fountain[]; // fountains not yet addressed
      exploredFountains: string[]; // cache of fountains that was addressed in order to not add them again in queue
    }
  | undefined
  | null;

const initialState = {
  frames: [],
  fountainsQueue: [],
  exploredFountains: [],
};

function resolveFountains(state: State): State {
  if (!state) return state;
  const fountainsQueue = state.fountainsQueue.slice(0);
  const frames = state.frames.slice(0);
  if (fountainsQueue.length === 0 || frames.length === 0) return state;
  const { framesCount } = frames[0];
  const framesByIndex: { [_: number]: Frame } = {};
  for (let i = 0; i < frames.length; ++i) {
    const frame = frames[i];
    framesByIndex[frame.index] = frame;
  }

  let i = 0;
  while (i < fountainsQueue.length) {
    const fountain = fountainsQueue[i];
    const existingFramesData = [];
    const missing = [];
    for (let j = 0; j < fountain.frameIndexes.length; ++j) {
      const index = fountain.frameIndexes[j];
      const f = framesByIndex[index];
      if (f) {
        existingFramesData.push(f.data);
      } else {
        missing.push(index);
      }
    }

    if (
      existingFramesData.length > 0 &&
      fountain.data.length !==
        Math.min(...existingFramesData.map((f) => f.length))
    ) {
      // drop the fountain that no longer match the frames data length
      fountainsQueue.splice(i, 1);
    } else if (missing.length === 0) {
      // fountain useless, simply eat it and continue on same index
      // TODO we could assert the data is equal to xor to do a checksum. not sure to do if does not match
      fountainsQueue.splice(i, 1);
    } else if (missing.length === 1) {
      // found a frame to recover. rebuild it
      const [index] = missing;
      const recoveredData = xor(existingFramesData.concat([fountain.data]));
      const head = Buffer.alloc(5);
      head.writeUInt8(0, 0);
      head.writeUInt16BE(framesCount, 1);
      head.writeUInt16BE(index, 3);
      const frame = {
        index,
        framesCount,
        data: recoveredData,
      };
      frames.push(frame);
      framesByIndex[index] = frame;

      fountainsQueue.splice(i, 1);
      // we start over to see if there is no impacted fountains
      i = 0;
    } else {
      i++;
    }
  }

  return {
    ...state,
    frames,
    fountainsQueue,
  };
}

/**
 * reduce frames data array to add on more chunk to it.
 * As a user of this function, consider the frames to be a black box and use the available functions to extract things.
 */
export function parseFramesReducer(_state: State, chunkStr: string): State {
  const state = _state || initialState;
  const chunk = Buffer.from(chunkStr, "base64");
  const head = chunk.slice(0, 5);
  const version = head.readUInt8(0);

  if (version === FOUNTAIN_V1) {
    if (state.exploredFountains.includes(chunkStr)) return state; // no need to address again
    const exploredFountains = state.exploredFountains.concat(chunkStr);
    const k = chunk.readUInt16BE(1);
    const frameIndexes = [];
    for (let i = 0; i < k; ++i) {
      frameIndexes.push(chunk.readUInt16BE(3 + 2 * i));
    }
    const data = chunk.slice(3 + 2 * k);
    const frames = state.frames;
    const fountain = {
      frameIndexes,
      data,
    };
    const fountainsQueue = state.fountainsQueue.concat(fountain);
    return resolveFountains({
      frames,
      fountainsQueue,
      exploredFountains,
    });
  }

  if (version >= MAX_NONCE) {
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

  return resolveFountains({
    ...state,
    frames: state.frames
      // override frame by index and also make sure all frames have same framesCount. this allows to not be stucked and recover any scenario.
      .filter((c) => c.index !== index && c.framesCount === framesCount)
      .concat({ framesCount, index, data }),
  });
}

/**
 * retrieve the total number of frames
 */
export const totalNumberOfFrames = (s: State): number | undefined | null =>
  s && s.frames.length > 0 ? s.frames[0].framesCount : null;

/**
 * get the currently captured number of frames
 */
export const currentNumberOfFrames = (s: State): number =>
  s ? s.frames.length : 0;

/**
 * get a progress value from 0 to 1
 */
export const progressOfFrames = (s: State): number => {
  const total = totalNumberOfFrames(s);
  if (!total) return 0;
  return currentNumberOfFrames(s) / total;
};

/**
 * check if the frames have all been retrieved
 */
export const areFramesComplete = (s: State): boolean =>
  totalNumberOfFrames(s) === currentNumberOfFrames(s);

/**
 * return final result of the frames. assuming you have checked `areFramesComplete`
 */
export function framesToData(s?: State): Buffer {
  if (!s) {
    throw new Error("invalid date: frames is undefined");
  }
  const all = Buffer.concat(
    s.frames
      .slice(0)
      .sort((a, b) => a.index - b.index)
      .map((frame) => frame.data)
  );

  const length = all.readUInt32BE(0);
  const expectedMD5 = all.slice(4, 20).toString("hex");
  const data = all.slice(20).slice(0, length);

  if (md5(data) !== expectedMD5) {
    throw new Error("invalid data: md5 doesn't match");
  }

  return data;
}
