import fs from 'fs';
import path from 'path';
import { curry } from 'ramda';

const checkDir = (directory: string) => {
  if (!fs.existsSync(directory)) {
    console.error(`ENOENT... CREATING DIRECTORY "${directory}"`);
    fs.mkdirSync(directory, { recursive: true });
  }
};

export const createStream: (string) => fs.WriteStream = (filepath) => {
  const dirname = path.dirname(filepath);
  checkDir(dirname);

  return fs.createWriteStream(filepath, { flags: 'a' });
};

/**
 * Curried write file function. Will create directory and file if they do not yet exist
 */
export const writeFile: (
  directory: string,
  filename?: string,
  content?: string
) => any = curry((directory: string, filename: string, content: string) => {
  // create directory if it doesn't exist yet
  checkDir(directory);

  console.log(`Writing to ${directory}/${filename}`);
  fs.writeFileSync(`${directory}/${filename}`, content, 'utf-8');
});

export const readFileSync = (filepath: string) => {
  try {
    console.log('opening', `${filepath}`);
    return fs.readFileSync(filepath, 'utf-8');
  } catch (err) {
    if (err.errno === -2) {
      // file doesn't exist yet
      writeFile(path.dirname(filepath), path.basename(filepath), '');
      return fs.readFileSync(filepath, 'utf-8');
    }
  }
};

export const readFile = (filename: string, path: string = './') => {
  return new Promise((res, rej) => {
    const open = () => fs.readFileSync(`${path}${filename}`, 'utf-8');

    try {
      console.log('opening', `${path}${filename}`);
      const data = open();
      res(data);
    } catch (err) {
      if (err.errno === -2) {
        // file doesn't exist yet
        fs.writeFileSync(`${path}${filename}`, '');
        res(open());
      }
      rej(err);
    }
  });
};
