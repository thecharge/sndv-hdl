## MODIFIED Requirements

### Requirement: UVM testbench infrastructure supports multiple clock stimuli
The UVM-lite testbench generator SHALL accept a `clocks` array in the testbench spec (one entry per clock domain) and emit separate clock stimulus processes for each clock in the generated SV harness.

#### Scenario: Dual-clock testbench generates two clock generators
- **WHEN** a `SeqTestSpec` specifies two clock entries with different half-periods
- **THEN** the generated SV testbench contains two `initial` clock-toggle processes with the specified periods

#### Scenario: Single-clock spec still works
- **WHEN** a `SeqTestSpec` specifies only `clockSignal` (legacy field)
- **THEN** the generated SV testbench contains exactly one clock generator, matching prior behavior

### Requirement: UVM testbench generator emits CDC-aware reset sequencing
When a testbench spec targets a multi-clock design, the generator SHALL emit a reset sequence that de-asserts reset after all declared clock domains have run for at least two cycles.

#### Scenario: Multi-clock reset holds until all domains stable
- **WHEN** a dual-clock spec is compiled to a SV testbench
- **THEN** the reset de-assertion occurs after max(2 * half_period_A, 2 * half_period_B) simulation time
