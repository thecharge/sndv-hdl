// Example: simple ALU computing sum, difference, and bitwise operations.
// Compile: ts2v compile examples/alu.ts -o build/alu.v

function alu_add(operand_a: number, operand_b: number): number {
  return operand_a + operand_b;
}

function alu_sub(operand_a: number, operand_b: number): number {
  return operand_a - operand_b;
}

function alu_and(operand_a: number, operand_b: number): number {
  return operand_a & operand_b;
}

function alu_or(operand_a: number, operand_b: number): number {
  return operand_a | operand_b;
}

function alu_xor(operand_a: number, operand_b: number): number {
  return operand_a ^ operand_b;
}
