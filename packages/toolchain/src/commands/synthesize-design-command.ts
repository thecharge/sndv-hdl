import type { SynthesisRequest, ToolchainAdapter, ToolchainResult } from '@ts2v/types';

export class SynthesizeDesignCommand {
  constructor(private readonly toolchainAdapter: ToolchainAdapter) {}

  async execute(request: SynthesisRequest): Promise<ToolchainResult> {
    return this.toolchainAdapter.synthesize(request);
  }
}
