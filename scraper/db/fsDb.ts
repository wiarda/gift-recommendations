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
    write: (input: Array<string | object>, streamName: string) => {
      if (typeof streamName !== "string") streamName = "default";
      const stream = getStream(streamName);

      input.forEach((x) => {
        if (typeof x !== "string") {
          x = JSON.stringify(x);
        }
        stream.write(`${x}\n`);
      });
    },
    export: (output: string, outputFilename: string) => {
      writeFile(`${path}/html`, outputFilename, output);
      return output;
    },
  };
}
