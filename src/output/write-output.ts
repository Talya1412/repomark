import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
export async function writeOutput(output: string | null, content: string): Promise<void> { if (output === null) process.stdout.write(content); else { await mkdir(path.dirname(output), { recursive: true }); await writeFile(output, content, 'utf8'); } }
