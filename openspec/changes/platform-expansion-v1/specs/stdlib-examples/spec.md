## ADDED Requirements

### Requirement: Hardware examples for all stdlib protocols
The project SHALL include at least one end-to-end hardware example per stdlib protocol module targeting Tang Nano 20K, located under `examples/hardware/tang_nano_20k/<protocol-name>/`.

#### Scenario: SPI example compiles and generates artifacts
- **WHEN** `bun run apps/cli/src/index.ts compile examples/hardware/tang_nano_20k/spi-loopback --board boards/tang_nano_20k.board.json --out .artifacts/spi-loopback`
- **THEN** the command exits 0 and `.artifacts/spi-loopback/` contains valid SV output

#### Scenario: UART echo example compiles
- **WHEN** the uart-echo example is compiled for Tang Nano 20K
- **THEN** the command exits 0 and generates SV

#### Scenario: WS2812 example compiles
- **WHEN** the ws2812-rainbow example is compiled for Tang Nano 20K
- **THEN** the command exits 0 and generates SV targeting pin 79

### Requirement: Multiclock domain crossing examples
The project SHALL include at least two examples demonstrating multiclock domain crossings: one using `ClockDomainCrossing<Logic>` and one using `AsyncFifo`.

#### Scenario: Two-FF crossing example compiles
- **WHEN** the dual-clock-sync example is compiled for Tang Nano 20K
- **THEN** the command exits 0 and the generated SV contains two-FF synchroniser logic

#### Scenario: AsyncFifo crossing example compiles
- **WHEN** the dual-clock-fifo example is compiled for Tang Nano 20K
- **THEN** the command exits 0 and the generated SV contains async FIFO logic

### Requirement: HDMI video output example
The project SHALL include an HDMI "Hello World" example that generates a static colour bar pattern on Tang Nano 20K.

#### Scenario: HDMI colour bar example compiles
- **WHEN** the hdmi-colour-bars example is compiled for Tang Nano 20K
- **THEN** the command exits 0 and the generated SV contains TMDS encoder instantiation

### Requirement: All new examples listed in README
Every new example SHALL be referenced in `README.md` under the Examples section.

#### Scenario: README references new examples
- **WHEN** a new hardware example directory is added under `examples/hardware/tang_nano_20k/`
- **THEN** README.md contains a link or reference to that example with a one-line description
