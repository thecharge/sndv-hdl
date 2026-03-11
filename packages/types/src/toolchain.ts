import type { CompileRequest } from './compiler';
import type { SupportedBoardId } from './config';

export interface SynthesisRequest {
  readonly compileRequest: CompileRequest;
  readonly topModuleName: string;
}

export interface FlashRequest {
  readonly bitstreamPath: string;
  readonly boardId: SupportedBoardId;
}

export interface ToolchainResult {
  readonly succeeded: boolean;
  readonly commandLog: ReadonlyArray<string>;
  readonly outputs: ReadonlyArray<string>;
}

export interface ToolchainAdapter {
  synthesize(request: SynthesisRequest): Promise<ToolchainResult>;
  flash(request: FlashRequest): Promise<ToolchainResult>;
}
