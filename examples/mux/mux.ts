// Example: 2-to-1 multiplexer using if/else -> ternary chain.
// Compile: ts2v compile examples/mux.ts -o build/mux.v

function mux_2to1(selector: boolean, input_a: number, input_b: number): number {
  if (selector) {
    return input_a;
  } else {
    return input_b;
  }
}
