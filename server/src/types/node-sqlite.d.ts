declare module 'node:sqlite' {
  export interface RunResult {
    changes: number | bigint;
    lastInsertRowid: number | bigint;
  }

  export class StatementSync {
    run(...params: Array<string | number | bigint | Uint8Array | null>): RunResult;
    get<T = Record<string, unknown>>(...params: Array<string | number | bigint | Uint8Array | null>): T | undefined;
    all<T = Record<string, unknown>>(...params: Array<string | number | bigint | Uint8Array | null>): T[];
  }

  export class DatabaseSync {
    constructor(location: string, options?: { open?: boolean; readOnly?: boolean });
    exec(sql: string): void;
    prepare(sql: string): StatementSync;
    close(): void;
  }
}
