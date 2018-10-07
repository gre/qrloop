# qrloop

Envelop big blob of data into frames that can be displayed in series of QR Codes.

<img src="https://user-images.githubusercontent.com/211411/46581095-0c663300-ca32-11e8-8366-5d4205a6e14f.gif" width="450" valign="top" /> <img src="https://user-images.githubusercontent.com/211411/46581275-1db13e80-ca36-11e8-9053-325b75511883.gif" width="400" />

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

## Trade-offs

### You do not need this if...

- You do not need this if your data can always fit in one big QR Code (check QR limits and test on phones).
- You do not need this if you have network condition and don't have privacy constraints and can afford storing the data on a server and just have a token to get it. You can also maybe use encrypted data, but beware decryption keys could leak!

### finding the correct QRCode dataSize

To find a good QRCode data size, we want to optimize the data we can put in each frame but we must not have a too big QR Code otherwise phones would have issues scanning it.

Empirical tests has shown that data size between 100-200 are the best and that after 200 threshold, the ability for phones starts to decline. A counter-intuitive result we have found is that QR Code with really few data in it (like below 50 bytes) are not easier to read than just 150 bytes and sometimes are even slower to read!

We have run an internal benchmark on various phones and get this result:

<img src="https://user-images.githubusercontent.com/211411/46581570-0c1e6580-ca3b-11e8-962a-7156dd7e9202.png">

### troubleshooting frames not getting caught

Since this is an unidirectional data stream, we can't tell the emitter to slow down or inform it what are the missing frames. Therefore, the emitter can just loop over all the frames until they are all parsed.

Statistically, this means the phone will catch many frames at the beginning and it will get harder and harder to catch the last frame. Statistically, the phone will eventually get all the frames but it can be a frustrating experience to be stuck with one last missing frame.

To troubleshoot this, you can try different FPS speed. Experience have shown phones are able to scan about 30 frames per second (depends on implementations) but in practice it's better to be at max 5 fps.

We also have empirically found that some frames are randomly harder for phone to catch. Therefore, we have in this library a concept of "replicas" which basically replicates frames with a nonce: one byte in the QR Code data completely change the qrcode, increasing our chance of falling on an "easy" frame.

### Data validation using a checksum

On top of QRCode built-in checksums, we have a data length check and md5 checksum validation over the data to make sure some frame are not corrupted. The library is also able to recover from any possible frame corruption state (if you continue scanning, it should eventually correct).

### Encoding complex objects

To encode complex objects like JavaScript objects over the data, you can just use `JSON.stringify`.
Since the result of `JSON.stringify` is not really optimized, you can then compress it using any compression algorithm like GZIP or `node-lzw` (my preferred because concise).
