#!/usr/bin/env node
// Generates API documentation from JSDoc/TSDoc comments in source files.
// Usage: tsx scripts/generate-docs.ts [--output docs/api.md]

import * as fs from 'fs';
import * as path from 'path';

const SOURCE_DIRECTORY = path.resolve(__dirname, '..', 'src');
const DEFAULT_OUTPUT_PATH = path.resolve(__dirname, '..', 'docs', 'api.md');

interface DocEntry {
  readonly file_path: string;
  readonly name: string;
  readonly kind: 'class' | 'function' | 'interface' | 'method';
  readonly comment: string;
  readonly signature: string;
}

// Extract doc entries from a single TypeScript file.
function extractDocEntries(file_path: string, content: string): DocEntry[] {
  const entries: DocEntry[] = [];
  const lines = content.split('\n');
  const relative_path = path.relative(SOURCE_DIRECTORY, file_path);

  for (let i = 0; i < lines.length; i++) {
    // Look for JSDoc block comments followed by declarations.
    if (!lines[i].trim().startsWith('/**')) continue;

    let comment = '';
    let j = i;
    while (j < lines.length && !lines[j].includes('*/')) {
      comment += lines[j].replace(/^\s*\*?\s?/, '').replace('/**', '').trim() + '\n';
      j++;
    }
    if (j < lines.length) {
      comment += lines[j].replace(/^\s*\*?\s?/, '').replace('*/', '').trim();
    }
    comment = comment.trim();

    // Next non-empty line is the declaration.
    const declaration_line_index = j + 1;
    if (declaration_line_index >= lines.length) continue;
    const declaration = lines[declaration_line_index].trim();

    const entry = parseDeclaration(relative_path, declaration, comment);
    if (entry) entries.push(entry);
  }

  return entries;
}

// Parse a declaration line into a DocEntry.
function parseDeclaration(file_path: string, declaration: string, comment: string): DocEntry | null {
  const class_match = declaration.match(/^export\s+class\s+(\w+)/);
  if (class_match) return { file_path, name: class_match[1], kind: 'class', comment, signature: declaration };

  const func_match = declaration.match(/^export\s+function\s+(\w+)/);
  if (func_match) return { file_path, name: func_match[1], kind: 'function', comment, signature: declaration };

  const interface_match = declaration.match(/^export\s+interface\s+(\w+)/);
  if (interface_match) return { file_path, name: interface_match[1], kind: 'interface', comment, signature: declaration };

  const method_match = declaration.match(/^\s*(\w+)\s*\(/);
  if (method_match) return { file_path, name: method_match[1], kind: 'method', comment, signature: declaration };

  return null;
}

// Walk directory tree and collect all .ts files.
function collectTypeScriptFiles(directory: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full_path = path.join(directory, entry.name);
    if (entry.isDirectory() && entry.name !== 'types') {
      results.push(...collectTypeScriptFiles(full_path));
    } else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts') && entry.name !== 'index.ts') {
      results.push(full_path);
    }
  }
  return results.sort();
}

// Format all doc entries into Markdown.
function formatMarkdown(entries: DocEntry[]): string {
  const sections: string[] = [
    '# ts2v API Documentation',
    '',
    'Auto-generated from source comments.',
    '',
    '---',
    '',
  ];

  const by_file = new Map<string, DocEntry[]>();
  for (const entry of entries) {
    const group = by_file.get(entry.file_path) ?? [];
    group.push(entry);
    by_file.set(entry.file_path, group);
  }

  for (const [file_path, file_entries] of by_file) {
    sections.push(`## ${file_path}`);
    sections.push('');
    for (const entry of file_entries) {
      sections.push(`### ${entry.kind}: \`${entry.name}\``);
      sections.push('');
      sections.push(entry.comment);
      sections.push('');
      sections.push('```typescript');
      sections.push(entry.signature);
      sections.push('```');
      sections.push('');
    }
  }

  return sections.join('\n');
}

// Main execution.
async function main(): Promise<void> {
  const output_path = process.argv.includes('--output')
    ? process.argv[process.argv.indexOf('--output') + 1]
    : DEFAULT_OUTPUT_PATH;

  const files = collectTypeScriptFiles(SOURCE_DIRECTORY);
  const all_entries: DocEntry[] = [];

  for (const file_path of files) {
    const content = await fs.promises.readFile(file_path, 'utf-8');
    all_entries.push(...extractDocEntries(file_path, content));
  }

  const markdown = formatMarkdown(all_entries);
  await fs.promises.mkdir(path.dirname(output_path), { recursive: true });
  await fs.promises.writeFile(output_path, markdown, 'utf-8');
  console.log(`Documentation generated: ${output_path} (${all_entries.length} entries)`);
}

main();
