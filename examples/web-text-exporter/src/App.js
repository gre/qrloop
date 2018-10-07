// @flow
import React, { Component } from "react";
import loremIpsum from "lorem-ipsum";
import { dataToFrames } from "qrloop/lib/exporter";
import QRCodeLoop from "./QRCodeLoop";
import "./App.css";

class App extends Component<{}, { value: string, frames: ?(string[]) }> {
  state = {
    value: loremIpsum({ count: 6, units: "paragraphs" }),
    frames: null
  };

  onExport = () => {
    this.setState(({ value }) => ({
      frames: dataToFrames(this.state.value, 100, 4)
    }));
  };

  onChange = (e: *) => {
    this.setState({ value: e.target.value });
  };

  render() {
    const { value, frames } = this.state;
    if (frames) {
      return (
        <div className="App">
          <QRCodeLoop frames={frames} fps={5} size={500} />
        </div>
      );
    }
    return (
      <div className="App">
        <button onClick={this.onExport}>Export This Text</button>
        <textarea value={value} onChange={this.onChange} />
        <footer>
          Expo app:{" "}
          <a href="https://exp.host/@gre/rn-text-importer">
            https://exp.host/@gre/rn-text-importer
          </a>
        </footer>
      </div>
    );
  }
}

export default App;
