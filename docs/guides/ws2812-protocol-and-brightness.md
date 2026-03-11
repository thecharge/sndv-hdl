# WS2812 Protocol And Brightness Notes

This guide explains a common confusion: WS2812 does not use a separate "brightness command" channel.

## Key Fact
WS2812 brightness is encoded in the RGB data values themselves.

There is no separate protocol command like "set brightness to 20%".

## What The Wire Carries
Per LED, WS2812 receives 24 bits in GRB order:
- 8 bits Green
- 8 bits Red
- 8 bits Blue

Each channel value is 0..255:
- `0` means off for that channel
- `255` means full channel output

Example:
- `0x00FF00` means full red in GRB packing used by this workspace examples.
- `0x000000` means fully off.

## Timing Rules (1-wire)
- A bit is represented by high/low pulse width.
- `0` bit uses shorter high pulse.
- `1` bit uses longer high pulse.
- A reset/latch interval (>50 us) is required between frames.

## Why A Strip Can Still Look Dead
Even with successful flash logs, no visible color can happen due to:
- wrong data pin mapping,
- no shared GND,
- weak or missing strip power,
- 3.3V data into 5V strip without proper level shifting,
- first LED damaged.

## Voltage-Level Practical Note
Many WS2812 strips powered at 5V have a high logic threshold close to 0.7 * VDD.
3.3V data may be marginal or fail.

If unstable or dead:
- add a 3.3V -> 5V level shifter (for example 74AHCT125/74AHCT14 path),
- or run strip at a lower supply that still matches WS2812 requirements,
- keep a solid shared ground.

## Bring-Up Strategy
1. Start with a solid, bright color frame.
2. Confirm any color appears at all.
3. Then move to color cycling and lower brightness effects.

## In This Repository
- Tang Nano 20K WS2812 pin mapping: `ws2812` -> `pin "79"` (`PIN79_WS2812`)
- Demo source: `examples/hardware/tang_nano_20k_ws2812b.ts`
- Quickstart: `docs/quickstart.md`
- Deep troubleshooting: `docs/guides/debugging-and-troubleshooting.md`
