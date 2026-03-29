# Social Distribution — Post Drafts

Ready-to-use copy for each platform. Edit the `[...]` placeholders before posting.

---

## LinkedIn

**Post — FPGA development with TypeScript (ts2v launch)**

---

We just open-sourced **ts2v** — a compiler that lets you write FPGA hardware in TypeScript
and have it synthesised to real silicon.

Instead of Verilog or VHDL:

```typescript
@Module
class RainbowWave extends HardwareModule {
    @Input  clk: Bit = 0;
    @Output ws2812: Bit = 0;

    @Sequential('clk')
    tick(): void {
        // ... hardware logic in TypeScript
    }
}
```

One command flashes this to a real FPGA:

```
bun run compile --board tang_nano_20k --flash
```

**Why TypeScript for hardware?**
- The type system maps naturally to fixed-width signals (`Logic<8>`, `Bit`)
- Decorators make port declarations and clock domains explicit
- The same dev toolchain (Bun, ESLint, type checking) works for both host and FPGA code
- 100% open-source synthesis (Yosys + nextpnr — no Vivado or Quartus licence needed)

We've been running this on the Sipeed Tang Nano 20K (GW2AR-18C, $15 board) with working
examples: WS2812 rainbow, UART calculator, live LED control over serial.

GitHub: [YOUR REPO URL]

Looking for feedback from hardware engineers, embedded developers, and anyone curious
about where the boundary between software and silicon is going.

#FPGA #TypeScript #OpenSource #HardwareEngineering #EmbeddedSystems #Yosys #Verilog

---

**Post — UART debugging story (technical deep-dive)**

---

A debugging story from hardware development: "Why doesn't the FPGA respond over UART?"

Worked through every hypothesis systematically:

1. Wrong serial port (`/dev/ttyUSB1` vs `/dev/ttyUSB2`) — eliminated
2. Flash reload issue (GW2AR-18C needs power-cycle after JTAG flash) — eliminated
3. Bun `serialport` crash — switched to pyserial subprocess, eliminated
4. FPGA firmware logic bug — traced full transaction in SystemVerilog, eliminated

**The actual cause:** the board JSON had `uart_tx=15, uart_rx=16` (LED pins).
The real UART connects to the BL616 USB bridge on pins **69 and 70**.
The onboard LEDs were receiving our "UART" data the whole time.

Lesson: always verify pin assignments against the official schematic, not just
community examples or guesswork. One wrong entry in a board definition file
silently breaks everything downstream.

Full guide: [LINK TO uart-serial-debugging.md]

#FPGA #Debugging #Hardware #EmbeddedSystems #Verilog #TypeScript

---

## X (Twitter)

**Tweet 1 — Project announcement**

```
We wrote a TypeScript-to-FPGA compiler.

Write @Module classes with @Input/@Output ports.
Get synthesisable IEEE 1800 SystemVerilog.
Flash to real hardware with one command.

Open source, runs on a $15 Sipeed Tang Nano 20K.

github: [YOUR REPO URL]

#FPGA #TypeScript #OpenSource #Verilog
```

---

**Tweet 2 — Debugging story (thread opener)**

```
Spent a week debugging why FPGA UART wasn't responding.

Checked the serial port. ✓
Checked the firmware logic (traced every clock cycle). ✓
Checked timing. ✓
Power-cycled the board. ✓

The board JSON had uart_tx on pin 15 (an LED).
The actual UART is on pin 69.

Hardware debugging is humbling. 🧵
```

Thread replies:
```
2/ The Tang Nano 20K uses a BL616 (not FTDI2232H) as its USB bridge.
   UART TX → FPGA pin 69
   UART RX → FPGA pin 70

   This is documented nowhere obvious. You have to read the official schematic.
```

```
3/ The fix was one line in boards/tang_nano_20k.board.json:
   "uart_tx": { "pin": "69" }
   "uart_rx": { "pin": "70" }

   After recompile and reflash → FPGA responded immediately.
```

```
4/ Takeaway: always verify pin assignments against the hardware schematic,
   not documentation that may have been written from the schematic of a
   different board revision.

   The uart_echo loopback example is now the first test in the UART guide.
```

---

**Tweet 3 — WS2812 / aurora demo**

```
Running a smooth HSV rainbow on 8 WS2812 LEDs from a $15 FPGA.

The colour engine is 3 piecewise-linear segments mapping an 8-bit hue to GRB.
No float math. No LUT. Just shifts and adds in SystemVerilog.

UART control for live colour changes over serial.

Written in TypeScript. [gif/video of the LEDs here]

#FPGA #WS2812 #LED #TypeScript #Hardware
```

---

## Reddit

**Subreddit: r/FPGA**

**Title:** I built a TypeScript-to-SystemVerilog compiler — write hardware as TS classes, compile to FPGA

**Post body:**

---

Hey r/FPGA,

I've been building **ts2v**, a compiler that translates TypeScript class definitions to IEEE
1800-2017 SystemVerilog and synthesises them to real FPGA hardware.

**Why TypeScript?**

I wanted a hardware description language that:
- Has a type system that maps naturally to fixed-width signals
- Works with existing tooling (LSP, type checker, linter)
- Has a familiar syntax for developers already writing software

The result looks like this:

```typescript
@Module
@ModuleConfig('resetSignal: "no_rst"')
class CalcEngine extends HardwareModule {
    @Input  rx_data:  Logic<8>  = 0;
    @Input  rx_valid: Bit       = 0;
    @Output tx_data:  Logic<8>  = 0;
    @Output tx_valid: Bit       = 0;

    private ceState: CalcSt = CalcSt.CE_WAIT_OP;

    @Sequential('clk')
    tick(): void {
        switch (this.ceState) {
            case CalcSt.CE_WAIT_OP:
                if (this.rx_valid === 1) {
                    this.ceState = CalcSt.CE_WAIT_A;
                }
                break;
            // ...
        }
    }
}
```

This compiles to correct `always_ff @(posedge clk)` blocks with proper non-blocking assignment semantics.

**Current examples on Tang Nano 20K (GW2AR-18C, $15 board):**
- WS2812 rainbow with smooth HSV colour model
- UART calculator (3-byte request, 2-byte result)
- Live LED control over serial

**Toolchain:** Yosys + nextpnr-gowin + gowin_pack + openFPGALoader, all running in a Podman container. No Vivado or Quartus needed.

**Repo:** [YOUR REPO URL]

**Known limitations:**
- No LogicArray indexed access in sequential logic (workaround: if/else chain)
- No parameterised modules
- No formal SVA temporal operators

Happy to discuss design decisions. The compiler source is in `packages/core/src/compiler/`.

---

**Subreddit: r/embedded**

**Title:** Debugging UART on FPGA: why it took a week to find one wrong pin number

**Post body:**

---

UART on FPGA "not responding" is a classic debugging trap. Here's what the systematic
approach actually looked like on a recent project.

**The setup:** Tang Nano 20K FPGA, Python pyserial client, UART calculator running at 115200 8N1.

**Hypothesis 1: wrong serial port**
The FTDI (or in this case, BL616) USB bridge creates two /dev/ttyUSBN ports — one for
JTAG (lower number) and one for UART (higher). With a second USB device connected,
the UART shifted from ttyUSB1 to ttyUSB2.

Fix: auto-detect with `ls /dev/ttyUSB* | sort -V | tail -1`. Eliminated, still no response.

**Hypothesis 2: flash reload**
The GW2AR-18C does not reliably reload from external flash after a JTAG reset. You need
a physical power cycle (unplug/replug USB). This caught me off guard — the `-r` flag in
openFPGALoader is not sufficient.

Fix: always power-cycle after flash. Eliminated.

**Hypothesis 3: client-side serial configuration**
Bun's `serialport` npm package crashes. Had to use raw `fs` calls (O_RDWR | O_NOCTTY |
O_NONBLOCK) then `stty` while the fd is held open. If you run `stty` before `openSync`,
the FTDI/BL616 driver resets to 9600 baud on open.

Switch to pyserial as the serial layer. Eliminated.

**Hypothesis 4: firmware logic bug**
Traced through every clock cycle of the generated SystemVerilog by hand. The logic was
correct — right state machine transitions, right bit period (234 clocks at 27 MHz for
115200), right shift register direction for LSB-first UART.

99 DFFs synthesised, timing passed at 282 MHz. Eliminated.

**The actual cause:**
The board definition had `uart_tx=15, uart_rx=16` — the LED pins. The real UART on the
Tang Nano 20K connects to the BL616 USB bridge chip on pins **69** and **70**. One wrong
entry in a board definition JSON file silently broke everything.

**Lessons:**
1. Verify pin assignments from the official schematic, not community examples
2. Write a UART echo loopback test before debugging any protocol logic
3. Power-cycle after every FPGA flash if you're using persistent flash
4. Use pyserial for hardware testing — it handles termios correctly without surprises

Full debugging guide: [LINK]

---

**Subreddit: r/programming** or **r/rust** (if you port) / **r/typescript**

**Title:** ts2v: TypeScript classes that compile to synthesisable FPGA hardware

**Post body:**

Short version: I wrote a compiler that takes TypeScript class definitions with decorators and
produces IEEE 1800-2017 SystemVerilog, which then gets synthesised and flashed to real FPGAs.

The key insight is that TypeScript's type system maps well to hardware:
- `Logic<8>` → `logic [7:0]` (8-bit signal)
- `@Sequential('clk')` → `always_ff @(posedge clk)`
- `@Input` / `@Output` → module port declarations
- `enum` → `typedef enum logic [N:0]`
- Private methods → inlined at call sites (no function calls in hardware)

Non-blocking assignment semantics are preserved: assignments in `@Sequential` methods
emit `<=` and all RHS values are the pre-clock values.

Repo: [YOUR REPO URL] — examples, compiler source, and a complete FPGA toolchain in a
Podman container.

Interested in feedback on the TS subset design and what constructs would be most useful
to add next.
