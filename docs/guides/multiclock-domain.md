# Multiclock Domain Guide

ts2v supports designs with multiple clock domains.  This guide covers
`@ClockDomain`, the `ClockDomainCrossing` primitive, `AsyncFifo`, and the
`--clock-constraints` flag.

## Declaring clock domains with @ClockDomain

By default, every `@Sequential('clk')` block drives a single `clk` input.  To
use a second domain, declare both in the module class:

```typescript
@Module
@ClockDomain('sys',  { freq: 27_000_000 })
@ClockDomain('fast', { freq: 108_000_000 })
class MyDesign extends HardwareModule {
    @Input  sys_clk:  Bit = 0;
    @Input  fast_clk: Bit = 0;
    ...
}
```

The compiler emits two `always_ff` blocks, each with its own sensitivity list
derived from the domain name.

## Two-FF synchroniser (ClockDomainCrossing)

Use `ClockDomainCrossing` from `@ts2v/stdlib/cdc` to safely transfer a single
bit or narrow bus between domains.  The submodule generates a two-register
chain clocked on the destination domain.

```typescript
import { ClockDomainCrossing } from './ClockDomainCrossing';

@Submodule cdc = new ClockDomainCrossing();

// parent signals auto-wired by name: d_in, d_out, rst_n, clk_slow
private d_in:   Bit = 0;
private d_out:  Bit = 0;
private clk_slow: Bit = 0;
```

See `examples/hardware/tang_nano_20k/dual-clock-sync/` for a complete example.

The compiler emits a CDC warning for any signal that crosses domains WITHOUT a
recognised `ClockDomainCrossing` or `AsyncFifo` instance wired in.

## Async FIFO (AsyncFifo)

`AsyncFifo` transfers a byte-width stream between write and read clock domains
using gray-code pointer synchronisers.

```typescript
import { AsyncFifo } from './AsyncFifo';

@Submodule fifo = new AsyncFifo();

// auto-wired ports: wr_clk, rd_clk, rst_n, wr_en, wr_data,
//                   rd_en, rd_data, full, empty
```

See `examples/hardware/tang_nano_20k/dual-clock-fifo/` for a complete example.

## Clock constraint generation

Pass `--clock-constraints <file.xdc>` to the compile command to emit one
`create_clock` line per `@ClockDomain` declaration:

```bash
bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/dual-clock-sync \
  --board boards/tang_nano_20k.board.json \
  --clock-constraints .artifacts/dual-clock-sync/clocks.xdc \
  --out .artifacts/dual-clock-sync
```

## CDC warning suppression

The compiler warns on unguarded cross-domain reads.  Suppress false positives
by instantiating the appropriate CDC primitive and ensuring its port names match
the signal names in the parent module.  Names must match exactly - the auto-wiring
uses name equality.
