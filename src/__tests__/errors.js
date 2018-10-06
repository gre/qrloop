import { dataToFrames } from "../exporter";
import {
  parseFramesReducer,
  areFramesComplete,
  currentNumberOfFrames,
  totalNumberOfFrames,
  framesToData
} from "../importer";

test("premature framesToData should throw", () => {
  expect(() => framesToData()).toThrow();
  expect(() => framesToData(null)).toThrow();

  const data = Buffer.from(
    Array(1000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const framesExport = dataToFrames(data, 200);
  expect(framesExport.length).toBeGreaterThan(2);
  const framesImport = parseFramesReducer(
    parseFramesReducer(null, framesExport[0]),
    framesExport[1]
  );

  expect(areFramesComplete(framesImport)).toBe(false);
  expect(currentNumberOfFrames(framesImport)).toBeLessThan(
    totalNumberOfFrames(framesImport)
  );
  expect(() => framesToData(framesImport)).toThrow();
});

test("corrupted data through framesToData should throw", () => {
  const data = Buffer.from(
    Array(1000)
      .fill(null)
      .map((_, i) => i % 256)
  );
  const framesExport = dataToFrames(data, 200);
  const framesImport = framesExport.reduce(parseFramesReducer, null);

  framesImport[1].data[10]++; // corrupt one bit of the second frame

  expect(() => framesToData(framesImport)).toThrow();
});

test("extra frames added to data should throw", () => {
  expect(() =>
    framesToData(
      dataToFrames(
        Buffer.from(
          Array(1000)
            .fill(null)
            .map((_, i) => i % 256)
        ),
        200
      )
        .reduce(parseFramesReducer, null)
        .concat(dataToFrames(Buffer.from("foo"), 100))
    )
  ).toThrow();
});
