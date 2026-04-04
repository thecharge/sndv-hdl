import type { FlashRequest, SynthesisRequest, ToolchainResult } from '@ts2v/types';
export declare class TangNano20kToolchainFacade {
  synthesize(request: SynthesisRequest): Promise<ToolchainResult>;
  flash(request: FlashRequest): Promise<ToolchainResult>;
}
