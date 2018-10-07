// @flow
import React, { PureComponent } from "react";
import qrcode from "qrcode";

type Props = {
  data: string,
  size: number
};

class QRCode extends PureComponent<Props> {
  componentDidMount() {
    this.draw();
  }

  componentDidUpdate() {
    this.draw();
  }

  canvas = React.createRef();

  draw() {
    const { data, size } = this.props;
    qrcode.toCanvas(this.canvas.current, data, { width: size });
  }

  render() {
    return <canvas style={{ cursor: "none" }} ref={this.canvas} />;
  }
}

export default QRCode;
