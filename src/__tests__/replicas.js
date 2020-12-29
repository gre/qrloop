import {
  dataToFrames,
  parseFramesReducer,
  areFramesComplete,
  progressOfFrames,
  currentNumberOfFrames,
  totalNumberOfFrames,
  framesToData,
} from "..";

test("'hello world' with 4 replicas", () => {
  const str = "hello world";
  const framesExport = dataToFrames(Buffer.from(str), 200, 4);

  const firstScanned = parseFramesReducer(null, framesExport[0]);
  expect(areFramesComplete(firstScanned)).toBe(true);
  expect(progressOfFrames(firstScanned)).toBe(1);
  expect(currentNumberOfFrames(firstScanned)).toBe(
    totalNumberOfFrames(firstScanned)
  );
  expect(framesToData(firstScanned).toString()).toBe(str);

  const secondScanned = parseFramesReducer(null, framesExport[1]);
  expect(areFramesComplete(secondScanned)).toBe(true);
  expect(progressOfFrames(secondScanned)).toBe(1);
  expect(currentNumberOfFrames(secondScanned)).toBe(
    totalNumberOfFrames(secondScanned)
  );
  expect(framesToData(secondScanned).toString()).toBe(str);

  const allScanned = framesExport.reduce(parseFramesReducer, undefined);
  expect(areFramesComplete(allScanned)).toBe(true);
  expect(progressOfFrames(allScanned)).toBe(1);
  expect(currentNumberOfFrames(allScanned)).toBe(
    totalNumberOfFrames(allScanned)
  );
  expect(framesToData(allScanned).toString()).toBe(str);
});

test("1/3 of the frames dropped in the middle is enough to recover with at least 3 replicas", () => {
  const data = Buffer.from(
    Array(1000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  for (let replicas = 3; replicas < 10; replicas++) {
    let framesExport = dataToFrames(data, 40, replicas);
    // drop 1/3 of the frames in the middle
    framesExport = framesExport
      .slice(0, Math.ceil(framesExport.length / 3))
      .concat(framesExport.slice(Math.floor((2 * framesExport.length) / 3)));

    const framesImport = framesExport.reduce(parseFramesReducer, undefined);
    expect(areFramesComplete(framesImport)).toBe(true);
    expect(progressOfFrames(framesImport)).toBe(1);
    expect(currentNumberOfFrames(framesImport)).toBe(
      totalNumberOfFrames(framesImport)
    );
    expect(framesToData(framesImport).toString("hex")).toBe(
      data.toString("hex")
    );
  }
});
