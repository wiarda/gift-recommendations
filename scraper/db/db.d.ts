export interface Db {
  write: (input: Array<unknown>, query?: unknown) => void;
  export: (filename: string, query?: unknown) => string;
}
