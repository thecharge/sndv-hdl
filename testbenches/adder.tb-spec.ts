// TypeScript testbench spec for the adder example.
// Source: examples/adder/adder.ts
// Tests: 32-bit combinational adder — result = a + b

import type { CombTestSpec } from '@ts2v/types';

export const adderSpec: CombTestSpec = {
    kind: 'combinational',
    module: 'add',
    sourceFile: 'examples/adder/adder.ts',
    ports: {
        inputs: [{ name: 'a', width: 32 }, { name: 'b', width: 32 }],
        outputs: [{ name: 'result', width: 32 }],
    },
    vectors: [
        { label: 'zero_plus_zero', inputs: { a: "32'd0", b: "32'd0" }, expected: { result: "32'd0" } },
        { label: 'one_plus_one', inputs: { a: "32'd1", b: "32'd1" }, expected: { result: "32'd2" } },
        { label: 'basic', inputs: { a: "32'd10", b: "32'd5" }, expected: { result: "32'd15" } },
        { label: 'wrap_carry', inputs: { a: "32'hFFFFFFFF", b: "32'h00000001" }, expected: { result: "32'h00000000" } },
        { label: 'hex_values', inputs: { a: "32'hDEAD0000", b: "32'h0000BEEF" }, expected: { result: "32'hDEADBEEF" } },
        { label: 'large_numbers', inputs: { a: "32'd1000000", b: "32'd999999" }, expected: { result: "32'd1999999" } },
    ],
};
