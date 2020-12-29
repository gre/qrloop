// @flow
import React from "react";
import { StyleSheet, Text, ScrollView, SafeAreaView } from "react-native";
import QRLoopScanner from "./QRLoopScanner";

export default class App extends React.Component<{}, { result: ?string }> {
  state = {
    result: null,
  };

  onResult = (result: string) => {
    this.setState({ result });
  };

  render() {
    const { result } = this.state;
    if (!result) return <QRLoopScanner onResult={this.onResult} />;
    return (
      <ScrollView style={styles.root}>
        <SafeAreaView style={styles.container}>
          <Text style={styles.text}>{result}</Text>
        </SafeAreaView>
      </ScrollView>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  container: {
    padding: 20,
  },
  text: {
    fontSize: 14,
  },
});
