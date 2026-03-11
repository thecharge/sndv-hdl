# Examples Matrix

## Existing Examples In Repository
- `examples/adder.ts`
- `examples/alu.ts`
- `examples/blinker.ts`
- `examples/comparator.ts`
- `examples/i2c.ts`
- `examples/mux.ts`
- `examples/pwm.ts`
- `examples/stdlib.ts`
- `examples/uart_tx.ts`
- `examples/ws2812.ts`

## Hardware-Oriented Expectations
- Blinker: baseline bring-up only.
- PWM / WS2812 / UART TX: peripheral-focused validation targets.
- CPU: validate from `cpu/ts/*.ts` through generated bitstream and board program.

## Current Validation Reality
- Compile pipeline for examples is working.
- CLI `--flash` path currently fails when generated source lacks a matching top module.
- Manual known-good RTL can complete synth + route + pack; board programming currently blocked by USB FTDI visibility in runtime.

## Next Examples To Promote
- Tang Nano 20K WS2812 demo with verified pin map.
- Tang Nano 20K UART TX demo with host-side serial capture script.
- CPU SoC bring-up with deterministic constraints and test procedure.
