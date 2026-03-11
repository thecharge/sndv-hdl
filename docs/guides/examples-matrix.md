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
- `examples/hardware/tang_nano_20k_reset_debug.ts`
- `examples/hardware/tang_nano_20k_uart_debug.ts`
- `examples/hardware/usb_jtag_probe_blinker.ts`

## Hardware-Oriented Expectations
- Blinker: first board proof with one deterministic LED output.
- USB probe blinker: confirms cable/profile correctness independent of complex logic.
- Reset debug: verifies reset and button wiring using dedicated indicators.
- UART debug: emits stable low-speed framing for scope/logic-analyzer checks.
- CPU: validate from `cpu/ts/*.ts` through generated bitstream and board program.

## Current Validation Reality
- Compile pipeline for examples is working.
- Hardware examples compile in package test suite.
- CLI `--flash` path compiles, synthesizes, and programs through profile-aware retries.
- Flash path uses `openFPGALoader --write-flash --verify` for persistent programming.
- Tang Nano 20K LEDs are active-low; example outputs account for that.

## Next Examples To Promote
- Tang Nano 20K WS2812 timing-accurate driver with measured pulse widths.
- Tang Nano 20K UART debug with host-side serial capture script.
- CPU SoC bring-up with deterministic constraints and end-to-end board checklist.
