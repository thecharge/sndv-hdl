"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateBoardConstraints = generateBoardConstraints;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const board_constraint_gen_1 = require("./board-constraint-gen");
function generateBoardConstraints(board, outDir) {
    const { filename, content } = (0, board_constraint_gen_1.generateConstraints)(board);
    const outputPath = (0, node_path_1.join)(outDir, filename);
    (0, node_fs_1.writeFileSync)(outputPath, content);
    return outputPath;
}
//# sourceMappingURL=generate-board-constraints.js.map