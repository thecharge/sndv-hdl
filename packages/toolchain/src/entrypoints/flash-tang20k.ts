import { SupportedBoardId } from '@ts2v/types';
import { TangNano20kToolchainFacade } from '../facades/tang-nano-20k-toolchain-facade';

async function run(): Promise<void> {
  const bitstreamPath = process.argv[2];
  if (!bitstreamPath) {
    throw new Error('Usage: bun run src/entrypoints/flash-tang20k.ts <path-to-bitstream.fs>');
  }

  const toolchainFacade = new TangNano20kToolchainFacade();
  const result = await toolchainFacade.flash({
    boardId: SupportedBoardId.TangNano20k,
    bitstreamPath,
  });

  for (const command of result.commandLog) {
    console.log(`[toolchain] ${command}`);
  }

  for (const output of result.outputs) {
    if (output.length > 0) {
      console.log(output);
    }
  }

  if (!result.succeeded) {
    process.exit(1);
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
