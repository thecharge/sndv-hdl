// Hardware type representation for Verilog code generation.

import { DEFAULT_BIT_WIDTH, BOOLEAN_BIT_WIDTH } from '../constants/defaults';

export enum HardwareTypeKind {
  Wire = 'Wire',
  Register = 'Register',
  WireArray = 'WireArray',
  RegisterArray = 'RegisterArray',
}

// A resolved hardware type with bit width.
export interface HardwareType {
  readonly type_kind: HardwareTypeKind;
  readonly bit_width: number;
  readonly is_signed: boolean;
  readonly array_size?: number;
}

// Standard hardware type for 32-bit number.
export const HARDWARE_TYPE_NUMBER: HardwareType = {
  type_kind: HardwareTypeKind.Wire,
  bit_width: DEFAULT_BIT_WIDTH,
  is_signed: true,
};

// Standard hardware type for 1-bit boolean.
export const HARDWARE_TYPE_BOOLEAN: HardwareType = {
  type_kind: HardwareTypeKind.Wire,
  bit_width: BOOLEAN_BIT_WIDTH,
  is_signed: false,
};

// Build an array hardware type.
export function makeArrayType(element_type: HardwareType, array_size: number): HardwareType {
  return {
    type_kind: HardwareTypeKind.WireArray,
    bit_width: element_type.bit_width,
    is_signed: element_type.is_signed,
    array_size,
  };
}

// Build a wire type with specific width.
export function makeWireType(bit_width: number, is_signed: boolean): HardwareType {
  return { type_kind: HardwareTypeKind.Wire, bit_width, is_signed };
}

// Compute the resulting type of a binary operation.
export function resolveBinaryResultType(left: HardwareType, right: HardwareType, operator: string): HardwareType {
  const is_comparison = ['===', '!==', '>', '<', '>=', '<='].includes(operator);
  if (is_comparison) return HARDWARE_TYPE_BOOLEAN;

  const wider_bit_width = Math.max(left.bit_width, right.bit_width);
  const is_signed = left.is_signed && right.is_signed;
  return makeWireType(wider_bit_width, is_signed);
}
