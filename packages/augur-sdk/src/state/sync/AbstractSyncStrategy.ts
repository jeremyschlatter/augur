import { Filter, Log, ParsedLog } from '@augurproject/types';

export abstract class AbstractSyncStrategy {
  constructor(
    protected getLogs: (filter: Filter) => Promise<Log[]>,
    protected contractAddresses: string[],
    protected onLogsAdded: (blockNumber: number, logs: ParsedLog[]) => Promise<void>
  ) {}

  // Returns the block number of the last block synced
  abstract start(blockNumber: number, endBlockNumber?: number): Promise<number>;
}
