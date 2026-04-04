/**
 * @deprecated Import from `@ts2v/types` instead.
 *
 * This file is kept for backward compatibility only.
 * All testbench spec types have moved to `packages/types/src/testbench.ts`
 * and are re-exported from the `@ts2v/types` package.
 *
 * Update your imports:
 *   import type { SeqTestSpec } from './tb-spec-types';
 *   // becomes:
 *   import type { SeqTestSpec } from '@ts2v/types';
 */
export type { CombTestVector, CombTestSpec, SeqCheckSpec, SeqTestSpec, TbSpec } from '@ts2v/types';
