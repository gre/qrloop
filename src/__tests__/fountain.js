import { dataToFrames } from "../exporter";
import { parseFramesReducer } from "../importer";

test("there is at least one fountain frame and it's recovering one frame", () => {
  [1000, 5000, 99999].forEach(size => {
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
