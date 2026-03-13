// TypeScript testbench spec for the mux example.
// Source: examples/mux/mux.ts
// Tests: 2-to-1 multiplexer — sel=0 → a, sel=1 → b

import type { CombTestSpec } from './tb-spec-types';

export const muxSpec: CombTestSpec = {
    kind: 'combinational',
    module: 'mux2to1',
    sourceFile: 'examples/mux/mux.ts',
    ports: {
        inputs: [{ name: 'a', width: 32 }, { name: 'b', width: 32 }, { name: 'sel', width: 1 }],
        outputs: [{ name: 'result', width: 32 }],
    },
    vectors: [
        { label: 'sel0_picks_a', inputs: { a: "32'd10", b: "32'd20", sel: "1'b0" }, expected: { result: "32'd10" } },
        { label: 'sel1_picks_b', inputs: { a: "32'd10", b: "32'd20", sel: "1'b1" }, expected: { result: "32'd20" } },
        { label: 'sel0_zeros', inputs: { a: "32'd0", b: "32'hFFFFFFFF", sel: "1'b0" }, expected: { result: "32'd0" } },
        { label: 'sel1_all_ones', inputs: { a: "32'd0", b: "32'hFFFFFFFF", sel: "1'b1" }, expected: { result: "32'hFFFFFFFF" } },
        { label: 'sel0_pattern', inputs: { a: "32'hABCD1234", b: "32'h0000DEAD", sel: "1'b0" }, expected: { result: "32'hABCD1234" } },
        { label: 'sel1_pattern', inputs: { a: "32'hABCD1234", b: "32'h0000DEAD", sel: "1'b1" }, expected: { result: "32'h0000DEAD" } },
        { label: 'same_both_sel0', inputs: { a: "32'd42", b: "32'd42", sel: "1'b0" }, expected: { result: "32'd42" } },
    ],
};
