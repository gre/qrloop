// @flow
import React from "react";
import { StyleSheet, Text, View, Dimensions } from "react-native";
import * as Progress from "react-native-progress";
import { Camera, Permissions } from "expo";
import {
  parseFramesReducer,
  areFramesComplete,
  framesToData,
  progressOfFrames
} from "qrloop/importer";

export default class QRLoopScanner extends React.Component<
  { onResult: string => void },
  { hasCameraPermission: ?boolean, progress: number }
> {
  state = {
    hasCameraPermission: null,
    progress: 0
  };

  async componentWillMount() {
    const { status } = await Permissions.askAsync(Permissions.CAMERA);
    this.setState({ hasCameraPermission: status === "granted" });
  }

  frames = null;

  onBarCodeScanned = ({ data }: { data: string }) => {
    try {
      const frames = (this.frames = parseFramesReducer(this.frames, data));
      if (areFramesComplete(frames)) {
        this.props.onResult(framesToData(frames).toString());
      } else {
        this.setState({
          progress: progressOfFrames(frames)
        });
      }
    } catch (e) {
      console.warn(e);
    }
  };

  render() {
    const { hasCameraPermission, progress } = this.state;

    if (hasCameraPermission === null) {
      return <View />;
    }

    if (hasCameraPermission === false) {
      return <Text>No access to camera</Text>;
    }

    return (
      <Camera
        style={styles.root}
        type={Camera.Constants.Type.back}
        onBarCodeScanned={this.onBarCodeScanned}
      >
        <Text style={styles.title}>Scan the QRCode loop</Text>
        <View style={styles.rect} />
        <Progress.Circle
          style={styles.progress}
          showsText={!!progress}
          progress={progress}
          color="white"
          borderWidth={0}
          thickness={progress ? 4 : 0}
          size={80}
          strokeCap="round"
          textStyle={styles.progressText}
        />
      </Camera>
    );
  }
}

const win = Dimensions.get("window");

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  rect: {
    width: win.width - 100,
    height: win.width - 100,
    borderColor: "white",
    borderWidth: 4
  },
  title: {
    color: "white",
    fontSize: 20,
    margin: 20
  },
  progressText: {
    color: "white",
    fontSize: 20
  },
  progress: {
    margin: 20
  }
});
