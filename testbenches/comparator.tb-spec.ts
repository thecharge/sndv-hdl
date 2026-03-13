// TypeScript testbench spec for the comparator example.
// Source: examples/comparator/comparator.ts
// Tests: combinational comparator — is_greater, is_equal, shifts, bitwise mask

import type { CombTestSpec } from './tb-spec-types';

export const comparatorSpec: CombTestSpec = {
    kind: 'combinational',
    module: 'is_greater',
    sourceFile: 'examples/comparator/comparator.ts',
    ports: {
        inputs: [{ name: 'a', width: 32 }, { name: 'b', width: 32 }],
        outputs: [{ name: 'result', width: 1 }],
    },
    vectors: [
        { label: 'a_greater', inputs: { a: "32'd10", b: "32'd5" }, expected: { result: "1'b1" } },
        { label: 'b_greater', inputs: { a: "32'd5", b: "32'd10" }, expected: { result: "1'b0" } },
        { label: 'equal', inputs: { a: "32'd7", b: "32'd7" }, expected: { result: "1'b0" } },
        { label: 'zero_vs_1', inputs: { a: "32'd0", b: "32'd1" }, expected: { result: "1'b0" } },
        { label: '1_vs_zero', inputs: { a: "32'd1", b: "32'd0" }, expected: { result: "1'b1" } },
        { label: 'max_vs_max', inputs: { a: "32'hFFFFFFFF", b: "32'hFFFFFFFF" }, expected: { result: "1'b0" } },
    ],
};
