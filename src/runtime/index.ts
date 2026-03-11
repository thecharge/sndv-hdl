// ts2v runtime — barrel export
//
// Import everything from here in your hardware modules:
//
//   import { HardwareModule, Module, Input, Output,
//            Sequential, Combinational, Logic, Bit } from 'ts2v/runtime';

export type {
  Logic,
  Bit,
  Uint1,
  Uint2,
  Uint4,
  Uint8,
  Uint16,
  Uint32,
  Uint64,
  LogicArray,
} from './types';

export {
  Module,
  Input,
  Output,
  Submodule,
  Sequential,
  Combinational,
  Assert,
} from './decorators';

export { HardwareModule } from './module';
