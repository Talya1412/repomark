import { access, readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
export async function exists(filePath: string): Promise<boolean> { try { await access(filePath); return true; } catch (error: unknown) { if (error instanceof Error && 'code' in error) return false; throw error; } }
export async function isDirectory(filePath: string): Promise<boolean> { const info = await stat(filePath); return info.isDirectory(); }
export async function readText(filePath: string): Promise<string | null> { if (!(await exists(filePath))) return null; return readFile(filePath, 'utf8'); }
export async function containsNamedFile(root: string, names: readonly string[]): Promise<boolean> { const entries = await readdir(root, { withFileTypes: true }); return entries.some((entry) => entry.isFile() && names.includes(entry.name)); }
export function resolveChild(root: string, child: string): string { return path.join(root, child); }
