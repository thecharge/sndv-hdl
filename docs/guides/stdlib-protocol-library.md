# stdlib Protocol Library Guide

`@ts2v/stdlib` ships hardware modules for common digital protocols.  Each
module is a standard ts2v `@Module` class; instantiate it with `@Submodule`
and auto-wire ports by name.

## I2C

**Module**: `I2cController` (`packages/stdlib/src/i2c/`)

Ports: `clk`, `start`, `addr[6:0]`, `rw`, `tx_data[7:0]`, `sda_in`, `scl`,
       `sda_out`, `sda_oe`, `rx_data[7:0]`, `done`, `ack_err`

Clock divisor constant `I2C_CLK_DIV` sets the bit period (270 = 100 kHz at
27 MHz).  Bring `start` high for one cycle to initiate a transfer.  Wait for
`done` to be asserted, then read `ack_err`.

**Example**: `examples/hardware/tang_nano_20k/i2c-scan/`

**Known limitation**: Only standard frames; no multi-master arbitration.

## SPI

**Modules**: `SpiController`, `SpiPeripheral` (`packages/stdlib/src/spi/`)

`SpiController` ports: `clk`, `tx_valid`, `tx_data[7:0]`, `miso`, `mosi`,
                        `sclk`, `cs_n`, `rx_data[7:0]`, `rx_valid`, `ready`

`SpiPeripheral` ports: `clk`, `sclk`, `cs_n`, `mosi`, `tx_data[7:0]`, `miso`,
                        `rx_data[7:0]`, `rx_valid`

**Example**: `examples/hardware/tang_nano_20k/spi-loopback/`

## UART

**Modules**: `UartTx`, `UartRx` (`packages/stdlib/src/uart/`)

`UartTx` ports: `clk`, `tx_data[7:0]`, `tx_valid`, `tx`, `ready`
`UartRx` ports: `clk`, `rx`, `rx_data[7:0]`, `rx_valid`

Baud rate set by `UART_BIT_PERIOD` constant (234 = 115200 baud at 27 MHz).

**Example**: `examples/hardware/tang_nano_20k/uart-echo/`

## CAN

**Module**: `CanController` (`packages/stdlib/src/can/`)

Standard (11-bit ID) CAN 2.0A frames at 1 Mbps (27 clocks/bit at 27 MHz).
Ports: `clk`, `can_rx`, `can_tx`, `tx_id[10:0]`, `tx_data[7:0]`, `tx_len[3:0]`,
       `tx_start`, `tx_busy`, `rx_valid`, `rx_id[10:0]`, `rx_data[7:0]`,
       `rx_len[3:0]`

## PWM

**Module**: `PwmGenerator` (`packages/stdlib/src/pwm/`)

Ports: `clk`, `period[23:0]`, `duty[23:0]`, `pwm_out`

**Example**: `examples/hardware/tang_nano_20k/pwm-fade/`

## 1-Wire

**Module**: `OneWireController` (`packages/stdlib/src/onewire/`)

Supports reset pulse, presence detect, write-byte, and read-byte operations.
Ports: `clk`, `cmd[1:0]`, `tx_byte[7:0]`, `start`, `dq_in`, `dq_out`,
       `dq_oe`, `rx_byte[7:0]`, `done`, `presence`

## WS2812

**Module**: `Ws2812Serialiser` (`packages/stdlib/src/ws2812/`)

Sends a 24-bit GRB frame over the WS2812 one-wire protocol at 27 MHz.
Ports: `clk`, `frame[23:0]`, `load`, `ws2812`, `ready`

**Example**: `examples/hardware/tang_nano_20k/ws2812-stdlib/`

## VGA

**Module**: `VgaTimingGenerator` (`packages/stdlib/src/vga/`)

640x480@60Hz timing.  Ports: `clk`, `hsync`, `vsync`, `active`, `pixel_x[9:0]`,
`pixel_y[9:0]`

**Example**: `examples/hardware/tang_nano_20k/hdmi-colour-bars/`

## HDMI/DVI

**Module**: `HdmiDviOutput` (`packages/stdlib/src/hdmi/`)

TMDS encoding for DVI output.  Accepts 8-bit RGB + sync signals; outputs 10-bit
TMDS words for each channel.  Ports: `clk`, `hsync`, `vsync`, `active`,
`red[7:0]`, `green[7:0]`, `blue[7:0]`, `tmds_red[9:0]`, `tmds_green[9:0]`,
`tmds_blue[9:0]`

Note: DDR serialisation (10:1) is not included - this module handles the
encoding pipeline only.

**Example**: `examples/hardware/tang_nano_20k/hdmi-colour-bars/`

## CDC Primitives

See [multiclock-domain.md](multiclock-domain.md) for `ClockDomainCrossing`
and `AsyncFifo`.
