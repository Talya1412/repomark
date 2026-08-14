import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { readText, resolveChild } from './filesystem.js';
import type { EvidenceMap, FeatureKey, ScanDiagnostics } from '../types.js';

const MAX_FILES = 500;
const MAX_DEPTH = 3;
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.rb', '.go', '.rs', '.java', '.kt', '.cs', '.php', '.swift', '.c', '.h', '.cpp', '.vue', '.svelte']);

type Entry = { relative: string; absolute: string; isDirectory: boolean; size: number; hasContent: boolean };
async function entries(root: string): Promise<{ files: Entry[]; diagnostics: ScanDiagnostics }> {
  const result: Entry[] = [];
  let depthLimited = false;
  let unreadableDirectories = 0;
  const visit = async (directory: string, relativeDirectory: string, depth: number): Promise<void> => {
    if (depth > MAX_DEPTH) { depthLimited = true; return; }
    if (result.length >= MAX_FILES) return;
    let children;
    try { children = await readdir(directory, { withFileTypes: true }); } catch (error: unknown) { if (depth === 0) throw error; unreadableDirectories += 1; return; }
    for (const child of children.sort((left, right) => left.name.localeCompare(right.name))) {
      if (result.length >= MAX_FILES) break;
      if (child.name === '.git' || child.name === 'node_modules' || child.name === 'dist' || child.name === 'coverage') continue;
      const relative = relativeDirectory ? path.posix.join(relativeDirectory, child.name) : child.name;
      const absolute = resolveChild(directory, child.name);
      if (child.isDirectory()) { await visit(absolute, relative, depth + 1); continue; }
      if (!child.isFile()) continue;
      const content = await readText(absolute);
      result.push({ relative, absolute, isDirectory: false, size: content?.length ?? 0, hasContent: content !== null && content.trim().length > 0 });
    }
  };
  await visit(root, '', 0);
  return { files: result, diagnostics: { filesScanned: result.length, maxFiles: MAX_FILES, maxDepth: MAX_DEPTH, truncated: depthLimited || result.length >= MAX_FILES, unreadableDirectories } };
}

const nonEmpty = (file: Entry): boolean => file.hasContent;
const isTestFile = (file: Entry): boolean => {
  if (/(^|\/)(test|tests|__tests__)(\/|$)/i.test(file.relative)) return true;
  const stem = path.posix.basename(file.relative).replace(/\.[^.]+$/, '');
  return /^(?:test|tests?)[_-].+$/i.test(stem) || /.+[_-]test$/i.test(stem) || /(?:^|\.)(test|spec)(?:[._-]|$)/i.test(stem);
};
const isDocFile = (file: Entry): boolean => /(^|\/)(docs|documentation)(\/|$)/i.test(file.relative) || /^(CONTRIBUTING|CHANGELOG|CODE_OF_CONDUCT)(?:\.[^.]+)?$/i.test(path.posix.basename(file.relative));

export async function detectEvidence(root: string): Promise<EvidenceMap> {
  return (await detectEvidenceWithDiagnostics(root)).evidence;
}
export async function detectEvidenceWithDiagnostics(root: string): Promise<{ evidence: EvidenceMap; diagnostics: ScanDiagnostics }> {
  const scanned = await entries(root);
  const files = scanned.files.filter(nonEmpty);
  const paths = (predicate: (file: Entry) => boolean): string[] => files.filter(predicate).map((file) => file.relative).sort();
  const workflows = paths((file) => /^\.github\/workflows\/[^/]+\.(yml|yaml)$/i.test(file.relative) || /^(?:\.gitlab-ci\.yml|\.circleci\/config\.yml|Jenkinsfile|azure-pipelines\.yml|\.travis\.yml|bitbucket-pipelines\.yml|appveyor\.yml)$/i.test(file.relative));
  const readmes = paths((file) => /^(?:README|README\.(?:md|markdown|rst|txt))$/i.test(file.relative));
  const licenses = paths((file) => /^(?:LICENSE|LICENCE)(?:\.[^.]+)?$/i.test(file.relative));
  const source = paths((file) => sourceExtensions.has(path.posix.extname(file.relative).toLowerCase()) && !isTestFile(file));
  const tests = paths(isTestFile);
  const docs = paths(isDocFile);
  const gitignore = paths((file) => file.relative === '.gitignore');
  const metadata = paths((file) => file.relative === 'package.json');
  return { evidence: { readme: readmes, license: licenses, gitignore, ci: workflows, tests, metadata, source, docs, activity: [] } satisfies EvidenceMap, diagnostics: scanned.diagnostics };
}
