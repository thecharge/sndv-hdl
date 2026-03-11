import type { FlashRequest, SynthesisRequest, ToolchainResult } from '@ts2v/types';
import { FlashBitstreamCommand } from '../commands/flash-bitstream-command';
import { TangNano20kToolchainFactory } from '../factories/tang-nano-20k-toolchain-factory';

export class TangNano20kToolchainFacade {
  async synthesize(request: SynthesisRequest): Promise<ToolchainResult> {
    const adapter = await new TangNano20kToolchainFactory().create();
    return adapter.synthesize(request);
  }

  async flash(request: FlashRequest): Promise<ToolchainResult> {
    const adapter = await new TangNano20kToolchainFactory().create();
    const command = new FlashBitstreamCommand(adapter);
    return command.execute(request);
  }
}
