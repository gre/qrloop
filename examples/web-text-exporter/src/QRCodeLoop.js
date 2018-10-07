// @flow

import React, { PureComponent } from "react";
import QRCode from "./QRCode";

export default class QRCodeLoop extends PureComponent<
  {
    frames: string[],
    size: number,
    fps: number
  },
  {
    frame: number
  }
> {
  state = {
    frame: 0
  };

  componentDidMount() {
    const nextFrame = ({ frame }, { frames }) => {
      frame = (frame + 1) % frames.length;
      return { frame };
    };

    let lastT;
    const loop = t => {
      this._raf = requestAnimationFrame(loop);
      if (!lastT) lastT = t;
      if ((t - lastT) * this.props.fps < 1000) return;
      lastT = t;
      this.setState(nextFrame);
    };
    this._raf = requestAnimationFrame(loop);
  }

  componentWillUnmount() {
    cancelAnimationFrame(this._raf);
  }

  _raf: *;

  render() {
    const { frame } = this.state;
    const { frames, size } = this.props;
    return (
      <div style={{ position: "relative", width: size, height: size }}>
        {frames.map((chunk, i) => (
          <div
            key={i}
            style={{ position: "absolute", opacity: i === frame ? 1 : 0 }}
          >
            <QRCode data={chunk} size={size} />
          </div>
        ))}
      </div>
    );
  }
}
