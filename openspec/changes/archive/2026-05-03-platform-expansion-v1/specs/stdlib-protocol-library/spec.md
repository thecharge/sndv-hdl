## ADDED Requirements

### Requirement: stdlib package exports protocol modules
The `@ts2v/stdlib` package SHALL export independently importable synthesisable TypeScript modules for: I2C controller, I2C peripheral, I3C controller, SPI controller, SPI peripheral, UART TX, UART RX, USB Full-Speed device, CAN/TWAI controller, PWM generator, one-wire controller, WS2812/NeoPixel driver, VGA timing generator, and HDMI/DVI output.

#### Scenario: SPI controller importable
- **WHEN** a user imports `SpiController` from `@ts2v/stdlib/spi`
- **THEN** the module compiles to valid IEEE 1800-2017 SV with a parametric clock divider

#### Scenario: UART TX importable
- **WHEN** a user imports `UartTx` from `@ts2v/stdlib/uart`
- **THEN** the module compiles with configurable baud divisor constant and produces a standard 8-N-1 serial stream

### Requirement: I2C controller module
The stdlib SHALL include an I2C controller supporting 100 kHz (standard) and 400 kHz (fast) modes, byte-level read/write operations, and multi-master bus arbitration detection.

#### Scenario: I2C byte write generates SCL/SDA
- **WHEN** the I2C controller receives a `start` pulse and an address + data byte
- **THEN** the SDA output follows the I2C protocol bit sequence with SCL toggling at the configured rate

### Requirement: SPI controller and peripheral modules
The stdlib SHALL include SPI controller (mode 0/1/2/3, configurable CS) and SPI peripheral (mode 0 only for this release) modules.

#### Scenario: SPI mode 0 loopback
- **WHEN** SPI controller and peripheral are connected in loopback in simulation
- **THEN** a byte transmitted by the controller is received correctly by the peripheral

### Requirement: UART TX and RX modules
The stdlib SHALL include UART TX and UART RX modules with configurable baud rate divisor, 8-N-1 framing, and oversampling RX (16x).

#### Scenario: UART TX produces correct bit sequence
- **WHEN** UART TX is given byte 0x55
- **THEN** the TX pin output follows the 8-N-1 bit sequence for 0x55 at the configured baud rate

### Requirement: HDMI/DVI output module
The stdlib SHALL include an HDMI/DVI output module that accepts RGB pixel data and hsync/vsync timing signals and produces TMDS-encoded differential output compatible with DVI receivers.

#### Scenario: HDMI module compiles with pixel clock domain
- **WHEN** the HDMI module is instantiated with a pixel-clock `@ClockDomain` and a 5x serialiser clock domain
- **THEN** the design compiles without CDC warnings and generates SV with TMDS encoder logic

### Requirement: WS2812 / NeoPixel driver
The stdlib SHALL include a WS2812 RGB LED driver that accepts a stream of 24-bit GRB values and serialises them using the WS2812 800 kHz protocol.

#### Scenario: WS2812 driver compiles and targets pin 79
- **WHEN** a WS2812 driver example is compiled for Tang Nano 20K
- **THEN** the generated SV instantiates the driver and the port maps to pin 79

### Requirement: CDC primitives in stdlib
The stdlib SHALL export `ClockDomainCrossing<Logic>` and `AsyncFifo<T, Depth>` from `@ts2v/stdlib/cdc` as the canonical CDC primitives.

#### Scenario: ClockDomainCrossing import resolves
- **WHEN** a TypeScript module imports `ClockDomainCrossing` from `@ts2v/stdlib/cdc`
- **THEN** the TypeScript compiler resolves the type and the ts2v compiler emits a two-FF synchroniser
