import type { SupportedBoardId, ToolchainAdapter } from '@ts2v/types';
type ToolchainAdapterFactory = () => Promise<ToolchainAdapter>;
export declare const BoardRegistry: Partial<Record<SupportedBoardId, ToolchainAdapterFactory>>;
export declare function getAdapter(boardId: SupportedBoardId): ToolchainAdapterFactory | undefined;
