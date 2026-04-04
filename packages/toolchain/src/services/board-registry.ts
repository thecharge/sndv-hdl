import { SupportedBoardId, type ToolchainAdapter } from '@ts2v/types';
import { TangNano9kToolchainFactory } from '../factories/tang-nano-9k-toolchain-factory';
import { TangNano20kToolchainFactory } from '../factories/tang-nano-20k-toolchain-factory';

type ToolchainAdapterFactory = () => Promise<ToolchainAdapter>;

export const BoardRegistry: Partial<Record<SupportedBoardId, ToolchainAdapterFactory>> = {
  [SupportedBoardId.TangNano20k]: () => new TangNano20kToolchainFactory().create(),
  [SupportedBoardId.TangNano9k]: () => new TangNano9kToolchainFactory().create(),
};

export function getAdapter(boardId: SupportedBoardId): ToolchainAdapterFactory | undefined {
  return BoardRegistry[boardId];
}
