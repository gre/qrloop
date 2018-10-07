# qrloop

Envelop big blob of data into frames that can be displayed in series of QR Codes.

<img src="https://user-images.githubusercontent.com/211411/46581095-0c663300-ca32-11e8-8366-5d4205a6e14f.gif" width="400" />

> NB. this library is generic enough to not even be used with QR Codes but still take optimization decision in regard to how QR code works and from empirical tests.

## Install

### for Web or Electron

```
yarn add qrloop
```

### for React Native

```
yarn add qrloop
yarn add buffer   # required
```

## API

There are 2 parts of the library, the "exporter" that want to export the data via QR codes and the "importer" that will scan these QR codes and accumulate the frames until it reaches the final result.

### exporter

The exporter only have 1 function to use: `dataToFrames`.

```js
import { dataToFrames } from "qrloop/exporter";

// examples
const frames: string[] = dataToFrames("hello world");
const frames = dataToFrames(Buffer.from([ 0x00, 0x01, ... ]));
const frames = dataToFrames(data, 140, 2);

// dataToFrames( data[, dataSize, replicas ])
// data: the complete data to encode in a series of QR code frames
// dataSize: the number of bytes to use from data for each frame
// replicas: (>= 1) the total number of loops to repeat the frames with varying a nonce. More there is, better the chance to not be stuck on a frame. Experience has shown some QR Code are harder to read.
```

You can find an implementation example in [`examples/web-text-exporter`](examples/web-text-exporter).

### importer

There are a few functions you can use to be able to consume and accumulate the frames over time.

The main function is `parseFramesReducer` that you feed with each QR Code data and will accumulate a state. Consider that state a black box and prefer using the utility functions to extract out information.

```js
import {
  parseFramesReducer,
  areFramesComplete,
  framesToData,
  progressOfFrames
} from "qrloop/importer";

const onResult = finalResult => console.log({ finalResult });

let frames = null;

const onBarCodeScanned = (data: string) => {
  try {
    frames = parseFramesReducer(frames, data);
    if (areFramesComplete(frames)) {
      onResult(framesToData(frames).toString());
    } else {
      console.log("Progress:", progressOfFrames(frames));
    }
  } catch (e) {
    console.warn(e); // a qrcode might fail. maybe the data is corrupted or you scan something that is not relevant.
  }
};
```

You can find an implementation example in [`examples/rn-text-importer`](examples/rn-text-importer).
