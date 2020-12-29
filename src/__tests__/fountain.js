import {
  dataToFrames,
  makeFountainFrame,
  makeDataFrame,
  wrapData,
  parseFramesReducer,
  areFramesComplete,
  currentNumberOfFrames,
  framesToData,
} from "..";
import { cutAndPad } from "../Buffer";

test("there is at least one fountain frame and it's recovering one frame", () => {
  [1000, 5000, 99999].forEach((size) => {
    const data = Buffer.from(
      Array(size)
        .fill(null)
        .map((_, i) => i % 256)
    );
    const framesExport = dataToFrames(data, 200, 4);

    let acc = null;
    for (let i = 0; i < framesExport.length; i++) {
      acc = parseFramesReducer(acc, framesExport[i]);
    }

    expect(acc.fountainsQueue.length).toBe(0);
    expect(acc.exploredFountains.length).toBeGreaterThan(0);
  });
});

test("wrapData", () => {
  const data = Buffer.from(
    Array(2000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const wrappedData = wrapData(data);
  const buffers = cutAndPad(wrappedData, 200);
  const frames = buffers.map((data, frameIndex) =>
    makeDataFrame({
      data,
      nonce: 0,
      frameIndex,
      totalFrames: buffers.length,
    })
  );
  const r = frames.reduce(parseFramesReducer, null);
  expect(areFramesComplete(r)).toBe(true);
  expect(framesToData(r).toString("hex")).toBe(data.toString("hex"));
});

test("a fountain can recover one missing frame", () => {
  const data = Buffer.from(
    Array(2000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const wrappedData = wrapData(data);
  const buffers = cutAndPad(wrappedData, 200);
  const frames = buffers.map((data, frameIndex) => ({
    frame: makeDataFrame({
      data,
      nonce: 0,
      frameIndex,
      totalFrames: buffers.length,
    }),
    frameIndex,
  }));
  for (let i = 0; i < buffers.length - 1; i++) {
    const framesMissingOne = frames.slice(0, i).concat(frames.slice(i + 1));
    const fountainFrame = makeFountainFrame(
      buffers,
      frames.map((o) => o.frameIndex)
    );
    const missingOne = framesMissingOne
      .map((o) => o.frame)
      .reduce(parseFramesReducer, null);
    expect(areFramesComplete(missingOne)).toBe(false);
    expect(currentNumberOfFrames(missingOne)).toBe(buffers.length - 1);
    const withFountains = parseFramesReducer(missingOne, fountainFrame);
    expect(areFramesComplete(withFountains)).toBe(true);
    expect(currentNumberOfFrames(withFountains)).toBe(buffers.length);
    expect(framesToData(withFountains).toString("hex")).toBe(
      data.toString("hex")
    );
  }
});

test("2 fountains cascading", () => {
  const data = Buffer.from(
    Array(2000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const wrappedData = wrapData(data);
  const buffers = cutAndPad(wrappedData, 200);
  const frames = buffers.map((data, frameIndex) => ({
    frame: makeDataFrame({
      data,
      nonce: 0,
      frameIndex,
      totalFrames: buffers.length,
    }),
    frameIndex,
  }));

  const framesMissingThree = frames.slice(2, frames.length - 1);
  const fountain1Frame = makeFountainFrame(
    buffers,
    frames.map((o) => o.frameIndex).slice(0, frames.length / 2)
  );
  const fountainAllFrame = makeFountainFrame(
    buffers,
    frames.map((o) => o.frameIndex)
  );
  const missingThree = framesMissingThree
    .map((o) => o.frame)
    .reduce(parseFramesReducer, null);
  expect(areFramesComplete(missingThree)).toBe(false);
  expect(currentNumberOfFrames(missingThree)).toBe(buffers.length - 3);
  const withFountains = [fountain1Frame, fountainAllFrame].reduce(
    parseFramesReducer,
    missingThree
  );
  expect(areFramesComplete(withFountains)).toBe(false);
  expect(currentNumberOfFrames(withFountains)).toBe(buffers.length - 3);
  const withOneMoreFrame = parseFramesReducer(withFountains, frames[0].frame);
  expect(areFramesComplete(withOneMoreFrame)).toBe(true);
  expect(currentNumberOfFrames(withOneMoreFrame)).toBe(buffers.length);
  expect(framesToData(withOneMoreFrame).toString("hex")).toBe(
    data.toString("hex")
  );
});
