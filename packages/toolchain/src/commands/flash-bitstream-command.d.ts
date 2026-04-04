import type { FlashRequest, ToolchainAdapter, ToolchainResult } from '@ts2v/types';
export declare class FlashBitstreamCommand {
  private readonly toolchainAdapter;
  constructor(toolchainAdapter: ToolchainAdapter);
  execute(request: FlashRequest): Promise<ToolchainResult>;
}
