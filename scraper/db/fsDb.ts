import fs from "fs";
import { Db } from "./db";
import { createStream, writeFile } from "../utils/fsutils";

export function FsDb(path: string): Db {
  const streams = {};
  const getStream: (streamName: string) => fs.WriteStream = (streamName) => {
    if (streams[streamName] === undefined) {
      streams[streamName] = createStream(`${path}/${streamName}`);
    }
    return streams[streamName];
  };

  return {
    write: (input: string, streamName: string) => {
      if (typeof streamName !== "string") streamName = "default";
      getStream(streamName).write(`${input}\n`);
    },
    export: (output: string, outputFilename: string) => {
      writeFile(path, outputFilename, output);
      return output;
    },
  };
}
