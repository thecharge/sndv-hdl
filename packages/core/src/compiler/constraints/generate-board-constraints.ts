import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { type BoardDefinition, generateConstraints } from './board-constraint-gen';

export type { BoardDefinition };

export function generateBoardConstraints(board: BoardDefinition, outDir: string): string {
  const { filename, content } = generateConstraints(board);
  const outputPath = join(outDir, filename);
  writeFileSync(outputPath, content);
  return outputPath;
}
