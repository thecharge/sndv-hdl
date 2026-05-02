## ADDED Requirements

### Requirement: ClockDomain decorator registers a named domain
The compiler SHALL recognise `@ClockDomain('name', { freq: number })` applied to a `@Module` class and register that class as belonging to the named clock domain. Each domain name MUST be unique within a module hierarchy.

#### Scenario: Single domain registration
- **WHEN** a `@Module` class is decorated with `@ClockDomain('sys', { freq: 27_000_000 })`
- **THEN** all `@Sequential` blocks inside that class are annotated with domain `sys` in the compiler AST

#### Scenario: Duplicate domain name rejected
- **WHEN** two sibling `@Module` classes in the same design register the same domain name
- **THEN** the compiler SHALL emit a descriptive error with source location and halt compilation

### Requirement: Sequential blocks inherit clock domain
All `@Sequential` blocks inside a `@ClockDomain`-decorated class SHALL generate `always_ff` blocks whose sensitivity list references the domain's clock signal.

#### Scenario: always_ff uses domain clock
- **WHEN** a module declares `@ClockDomain('sys', { freq: 27_000_000 })` and contains a `@Sequential` block
- **THEN** the generated SV contains `always_ff @(posedge sys_clk or negedge rst_n)` using the domain name as the clock signal name prefix

### Requirement: Cross-domain signal detection
The compiler SHALL detect when a signal produced in one clock domain is consumed in a different clock domain without a recognised CDC primitive on the path.

#### Scenario: Unguarded cross-domain use emits warning
- **WHEN** signal `x` is assigned in domain `A` and read in domain `B` with no `ClockDomainCrossing` or `AsyncFifo` on the path
- **THEN** the compiler SHALL emit a warning identifying the signal name and both domain names

### Requirement: Two-FF synchroniser emission
`ClockDomainCrossing<Logic>` imported from `@ts2v/stdlib/cdc` SHALL cause the compiler to emit a two-FF synchroniser chain in the destination domain's clock.

#### Scenario: Two-FF chain generated
- **WHEN** a module instantiates `ClockDomainCrossing<Logic>` crossing from domain `A` to domain `B`
- **THEN** the generated SV contains two sequential `always_ff` register stages in domain `B`'s clock

### Requirement: AsyncFifo emission for multi-bit crossings
`AsyncFifo<T, Depth>` imported from `@ts2v/stdlib/cdc` SHALL cause the compiler to emit a dual-port RAM-based async FIFO with gray-code pointers crossing between two clock domains.

#### Scenario: AsyncFifo generates dual-clock FIFO
- **WHEN** a module instantiates `AsyncFifo<LogicArray<8>, 16>` between domain `A` (write) and domain `B` (read)
- **THEN** the generated SV contains `always_ff` write logic in domain `A`'s clock and `always_ff` read logic in domain `B`'s clock with gray-code pointer synchronisers

### Requirement: Clock constraint file output
When the `--clock-constraints` CLI flag is passed, the compiler SHALL emit a nextpnr-compatible SDC file listing all declared clock domains with their frequencies.

#### Scenario: SDC file lists all domains
- **WHEN** a design declares two `@ClockDomain` instances and is compiled with `--clock-constraints out.sdc`
- **THEN** `out.sdc` contains `create_clock` entries for each domain with the declared frequency
