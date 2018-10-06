import { dataToFrames } from "../exporter";
import {
  parseFramesReducer,
  areFramesComplete,
  progressOfFrames,
  currentNumberOfFrames,
  totalNumberOfFrames,
  framesToData
} from "../importer";

test("empty data", () => {
  const str = "";
  const framesExport = dataToFrames(Buffer.from(str), 100);
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
  const framesExport = dataToFrames(Buffer.from(str), 100);
  const framesImport = framesExport.reduce(parseFramesReducer, undefined);
  expect(areFramesComplete(framesImport)).toBe(true);
  expect(progressOfFrames(framesImport)).toBe(1);
  expect(currentNumberOfFrames(framesImport)).toBe(
    totalNumberOfFrames(framesImport)
  );
  expect(framesToData(framesImport).toString()).toBe(str);
});

test("'hello world' x1000", () => {
  let str = Array(1000)
    .fill("hello world")
    .join(" ");
  const framesExport = dataToFrames(Buffer.from(str), 50);
  let framesImport = null;
  for (let i = 0; i < framesExport.length; i++) {
    expect(currentNumberOfFrames(framesImport)).toBe(i);
    expect(progressOfFrames(framesImport)).toBe(i / framesExport.length);
    expect(areFramesComplete(framesImport)).toBe(false);
    framesImport = parseFramesReducer(framesImport, framesExport[i]);
    expect(totalNumberOfFrames(framesImport)).toBe(framesExport.length);
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
