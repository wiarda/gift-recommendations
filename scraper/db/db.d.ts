export interface Db {
  write: (input: unknown, query?: unknown) => void;
  export: (filename: string, query?: unknown) => string;
}
