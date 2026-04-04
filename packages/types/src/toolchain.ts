import type { CompileRequest } from './compiler';
import type { SupportedBoardId } from './config';

/** Input parameters for a synthesis-and-pack run (Yosys + nextpnr + gowin_pack). */
export interface SynthesisRequest {
  /** Upstream compile request that produced the SystemVerilog sources. */
  readonly compileRequest: CompileRequest;
  /** Name of the top-level SystemVerilog module to synthesise. */
  readonly topModuleName: string;
}

/** Input parameters for a bitstream flash operation. */
export interface FlashRequest {
  /** Absolute path to the `.fs` or `.bit` bitstream file to program. */
  readonly bitstreamPath: string;
  /** Target board identifier, used to select the correct programmer profile. */
  readonly boardId: SupportedBoardId;
}

/** Outcome of a toolchain stage (synthesis or flash). */
export interface ToolchainResult {
  /** True when the toolchain stage completed without error. */
  readonly succeeded: boolean;
  /** Full command log (each entry = one executed command line + its output). */
  readonly commandLog: ReadonlyArray<string>;
  /** Paths to output files produced (e.g. bitstream path after synthesis). */
  readonly outputs: ReadonlyArray<string>;
}

/** Contract for a toolchain back-end that can synthesise and flash hardware. */
export interface ToolchainAdapter {
  synthesize(request: SynthesisRequest): Promise<ToolchainResult>;
  flash(request: FlashRequest): Promise<ToolchainResult>;
}
