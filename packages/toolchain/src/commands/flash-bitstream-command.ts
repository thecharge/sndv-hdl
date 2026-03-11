import type { FlashRequest, ToolchainAdapter, ToolchainResult } from '@ts2v/types';

export class FlashBitstreamCommand {
  constructor(private readonly toolchainAdapter: ToolchainAdapter) {}

  async execute(request: FlashRequest): Promise<ToolchainResult> {
    return this.toolchainAdapter.flash(request);
  }
}
