# Capability: Board Toolchain Registry

**Owner:** Toolchain Agent + Build Agent
**Status:** Active

A runtime registry that maps each supported board identity to the toolchain adapter factory responsible for synthesis, place-and-route, bitstream pack, and flash operations. The registry decouples the CLI from hardcoded adapter references and enables new boards to be added without modifying the compile-command handler.
