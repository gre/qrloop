import {
  dataToFrames,
  parseFramesReducer,
  areFramesComplete,
  progressOfFrames,
  currentNumberOfFrames,
  totalNumberOfFrames,
  framesToData,
} from "..";

test("empty data", () => {
  const str = "";
  const framesExport = dataToFrames(str);
  const framesImport = framesExport.reduce(parseFramesReducer, undefined);
  expect(areFramesComplete(framesImport)).toBe(true);
  expect(progressOfFrames(framesImport)).toBe(1);
  expect(currentNumberOfFrames(framesImport)).toBe(
    totalNumberOfFrames(framesImport)
  );
  expect(framesToData(framesImport).toString()).toBe(str);
});

test("'hello world'", () => {
  const str = "hello world";
  const framesExport = dataToFrames(str);
  const framesImport = framesExport.reduce(parseFramesReducer, undefined);
  expect(areFramesComplete(framesImport)).toBe(true);
  expect(progressOfFrames(framesImport)).toBe(1);
  expect(currentNumberOfFrames(framesImport)).toBe(
    totalNumberOfFrames(framesImport)
  );
  expect(framesToData(framesImport).toString()).toBe(str);
});

test("'hello world' x1000", () => {
  let str = Array(1000).fill("hello world").join(" ");
  const framesExport = dataToFrames(Buffer.from(str), 50);
  let framesImport = null;
  let frameLength: number | null | undefined = -1;
  let frameCompleteReached = false;
  let frameProgress = 0;
  for (let i = 0; i < framesExport.length; i++) {
    expect(progressOfFrames(framesImport)).toBeGreaterThanOrEqual(
      frameProgress
    );
    frameProgress = progressOfFrames(framesImport);
    expect(frameProgress).toBeGreaterThanOrEqual(0);
    expect(frameProgress).toBeLessThanOrEqual(1);
    if (areFramesComplete(framesImport)) {
      frameCompleteReached = true;
    } else {
      expect(frameCompleteReached).toBe(false); // never go back to uncomplete
    }
    framesImport = parseFramesReducer(framesImport, framesExport[i]);
    if (frameLength === -1) frameLength = totalNumberOfFrames(framesImport);
    expect(totalNumberOfFrames(framesImport)).toBe(frameLength);
  }
  expect(areFramesComplete(framesImport)).toBe(true);
  expect(progressOfFrames(framesImport)).toBe(1);
  expect(currentNumberOfFrames(framesImport)).toBe(
    totalNumberOfFrames(framesImport)
  );
  expect(framesToData(framesImport).toString()).toBe(str);
});

test("binary", () => {
  const data = Buffer.from(
    Array(10000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const framesExport = dataToFrames(data, 200);
  expect(framesExport).toMatchSnapshot();
  const framesImport = framesExport.reduce(parseFramesReducer, undefined);
  expect(areFramesComplete(framesImport)).toBe(true);
  expect(progressOfFrames(framesImport)).toBe(1);
  expect(currentNumberOfFrames(framesImport)).toBe(
    totalNumberOfFrames(framesImport)
  );
  expect(framesToData(framesImport).toString("hex")).toBe(data.toString("hex"));
});

test("binary test many size", () => {
  for (let i = 0; i < 2000; i++) {
    const data = Buffer.from(
      Array(i)
        .fill(null)
        .map((_, i) => i % 256)
    );
    const framesExport = dataToFrames(data, 200);
    const framesImport = framesExport.reduce(parseFramesReducer, undefined);
    expect(framesToData(framesImport).toString("hex")).toBe(
      data.toString("hex")
    );
  }
});
