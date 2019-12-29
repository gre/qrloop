// @flow
import React, { useState, useCallback } from "react";
import { loremIpsum } from "lorem-ipsum";
import { dataToFrames } from "qrloop";
import QRCodeLoop from "./QRCodeLoop";
import "./App.css";

const App = () => {
  const [value, setValue] = useState(() =>
    loremIpsum({ count: 6, units: "paragraphs" })
  );

  const [frames, setFrames] = useState(null);

  const onExport = useCallback(() => {
    setFrames(dataToFrames(value, 100, 4));
  }, [value]);

  const onChange = useCallback((e: *) => {
    setValue(e.target.value);
  }, []);

  if (frames) {
    return (
      <div className="App">
        <QRCodeLoop frames={frames} fps={5} size={500} />
      </div>
    );
  }

  return (
    <div className="App">
      <button onClick={onExport}>Export This Text</button>
      <textarea value={value} onChange={onChange} />
      <footer>
        Expo app:{" "}
        <a href="https://exp.host/@gre/rn-text-importer">
          https://exp.host/@gre/rn-text-importer
        </a>
      </footer>
    </div>
  );
};

export default App;
