import assert from 'node:assert/strict';
import test from 'node:test';
import { parseArgs } from '../src/args.js';
import { escapeHtml, escapeMarkdown } from '../src/renderers/escape.js';
import { HELP } from '../src/args.js';
import { renderHtml } from '../src/renderers/html.js';
import { renderMarkdown } from '../src/renderers/markdown.js';
import { renderTerminal } from '../src/renderers/terminal.js';
import { gradeFor, scoreRepository } from '../src/scoring/score-repository.js';
import { writeOutput } from '../src/output/write-output.js';
import type { Comparison, EvidenceMap, RepositoryFacts } from '../src/types.js';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { detectEvidence } from '../src/repository/detection.js';
import { gitFacts } from '../src/repository/git.js';
import { packageMetadata } from '../src/repository/package-metadata.js';
import { scanRepository } from '../src/repository/scan-repository.js';
import { renderJson } from '../src/renderers/json.js';
import { renderBadge } from '../src/renderers/badge.js';
import { compareReports } from '../src/comparison.js';

const execFileAsync = promisify(execFile);

const facts: RepositoryFacts = { path: '/tmp/repo', name: 'demo', isGit: true, features: { readme: true, license: true, gitignore: true, ci: true, tests: true, metadata: true, source: true, docs: true, activity: true }, evidence: { readme: ['README.md'], license: ['LICENSE'], gitignore: ['.gitignore'], ci: ['.github/workflows/ci.yml'], tests: ['test/core.test.ts'], metadata: ['package.json'], source: ['src/main.ts'], docs: ['CHANGELOG.md'], activity: [] }, activityDays: 1, gitBranch: 'main', packageName: 'demo' };
const findingEvidence: EvidenceMap = { readme: ['README.md'], license: ['LICENSE'], gitignore: ['.gitignore'], ci: ['.github/workflows/ci.yml'], tests: ['test|bad.md'], metadata: ['package.json'], source: ['src/main.ts'], docs: ['CHANGELOG.md'], activity: [] };
const reportWithFinding = scoreRepository({ ...facts, name: '<demo>', features: { ...facts.features, tests: false }, evidence: findingEvidence }, new Date('2026-01-01T00:00:00.000Z'));
async function tempRepository(): Promise<string> { return mkdtemp(path.join(os.tmpdir(), 'repomark-test-')); }
async function writeRepositoryFile(root: string, relative: string, content: string): Promise<void> {
  const file = path.join(root, ...relative.split('/'));
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}
test('parses format and threshold', () => { const options = parseArgs(['demo', '--format', 'json', '--threshold', '75', '--no-color']); assert.equal(options.path, 'demo'); assert.equal(options.format, 'json'); assert.equal(options.threshold, 75); assert.equal(options.color, false); });
test('parses optional baseline comparison path', () => { assert.equal(parseArgs(['--compare', 'baseline.json']).compare, 'baseline.json'); assert.throws(() => parseArgs(['--compare']), /requires a value/); });
test('rejects invalid threshold', () => { assert.throws(() => parseArgs(['--threshold', '101']), /threshold/); });
test('rejects invalid or missing format', () => { assert.throws(() => parseArgs(['--format', 'yaml']), /format/); assert.throws(() => parseArgs(['--format']), /requires a value/); assert.throws(() => parseArgs(['--format', '--output', 'report.txt']), /requires a value/); });
test('rejects missing output values', () => { assert.throws(() => parseArgs(['--output']), /--output requires a value/); assert.throws(() => parseArgs(['--output', '--badge-output', 'badge.svg']), /--output requires a value/); assert.throws(() => parseArgs(['--badge-output']), /--badge-output requires a value/); });
test('rejects missing threshold values', () => { assert.throws(() => parseArgs(['--threshold']), /--threshold requires a value/); assert.throws(() => parseArgs(['--threshold', '--format', 'json']), /--threshold requires a value/); });
test('classifies CLI usage errors separately from scan failures', async () => {
  await assert.rejects(execFileAsync(process.execPath, ['dist/src/cli.js', '--format', 'yaml']), (error: unknown) => error !== null && typeof error === 'object' && 'code' in error && error.code === 2);
  await assert.rejects(execFileAsync(process.execPath, ['dist/src/cli.js', '--threshold', '101']), (error: unknown) => error !== null && typeof error === 'object' && 'code' in error && error.code === 2);
  await assert.rejects(execFileAsync(process.execPath, ['dist/src/cli.js', '--output']), (error: unknown) => error !== null && typeof error === 'object' && 'code' in error && error.code === 2);
  await assert.rejects(execFileAsync(process.execPath, ['dist/src/cli.js', 'missing-repomark-path']), (error: unknown) => error !== null && typeof error === 'object' && 'code' in error && error.code === 3);
  const valid = await execFileAsync(process.execPath, ['dist/src/cli.js', '--format', 'json', '.']);
  assert.match(valid.stdout, /"score"/);
});
test('creates parent directories for explicit output', async () => { const root = await mkdtemp(path.join(os.tmpdir(), 'repomark-')); const output = path.join(root, 'nested', 'report.txt'); try { await writeOutput(output, 'report'); assert.equal(await readFile(output, 'utf8'), 'report'); } finally { await rm(root, { recursive: true, force: true }); } });
test('scores full repository deterministically', () => { const report = scoreRepository(facts, new Date('2026-01-01T00:00:00.000Z')); assert.equal(report.score, 100); assert.equal(report.grade, 'A'); assert.equal(report.generatedAt, '2026-01-01T00:00:00.000Z'); });
test('grades boundaries', () => { assert.equal(gradeFor(90), 'A'); assert.equal(gradeFor(75), 'B'); assert.equal(gradeFor(60), 'C'); assert.equal(gradeFor(40), 'D'); assert.equal(gradeFor(39), 'F'); });
test('compares score, evidence, findings, regressions, and recoveries deterministically', () => {
  const baseline = scoreRepository({ ...facts, features: { ...facts.features, tests: false }, evidence: findingEvidence }, new Date('2026-01-01T00:00:00.000Z'));
  const current = scoreRepository(facts, new Date('2026-01-01T00:00:00.000Z'));
  const comparison = compareReports(current, baseline);
  assert.equal(comparison.scoreDelta, 15);
  assert.deepEqual(comparison.recoveries, ['Tests']);
  assert.deepEqual(comparison.regressions, []);
  assert.deepEqual(comparison.newFindings, []);
  assert.deepEqual(comparison.resolvedFindings, ['tests']);
  assert.deepEqual(compareReports(current, current), { baselineScore: 100, scoreDelta: 0, baselineGrade: 'A', regressions: [], recoveries: [], changedEvidence: [], newFindings: [], resolvedFindings: [] });
});
test('badge color follows grade and escapes label values', () => { assert.match(renderBadge({ ...reportWithFinding, name: '<demo>' }), /#4c9aff/); assert.match(renderBadge({ ...reportWithFinding, name: '<demo>' }), /aria-label="repomark: 85\/100 B"/); });
test('escapes output control characters', () => { assert.equal(escapeHtml('<x> & "'), '&lt;x&gt; &amp; &quot;'); assert.equal(escapeMarkdown('a|[b]'), 'a\\|\\[b\\]'); });
test('renders evidence and actionable findings in terminal without color', () => { const output = renderTerminal(reportWithFinding, false); assert.match(output, /Evidence: test\|bad\.md/); assert.match(output, /Findings/); assert.match(output, /Action:/); assert.doesNotMatch(output, /\u001b\[/); });
test('renders escaped evidence and findings in Markdown and HTML', () => { const markdown = renderMarkdown(reportWithFinding); assert.match(markdown, /## Evidence/); assert.match(markdown, /test\\\|bad\.md/); assert.match(markdown, /## Findings/); const html = renderHtml(reportWithFinding); assert.match(html, /<h2 id="evidence-title">Evidence<\/h2>/); assert.match(html, /test\|bad\.md/); assert.match(html, /class="finding severity-high"/); assert.doesNotMatch(html, /<demo>/); });
test('renders complete HTML comparison, diagnostics, and escaped evidence paths', () => {
  const comparison: Comparison = { baselineScore: 70, scoreDelta: 15, baselineGrade: 'C', regressions: ['CI < broken'], recoveries: ['Tests'], changedEvidence: ['docs/a & b.md'], newFindings: ['new <finding>'], resolvedFindings: ['old finding'] };
  const report = scoreRepository({ ...facts, name: '<demo>', evidence: { ...findingEvidence, docs: ['long/<path>&.md'] }, provenance: { scanner: 'local-filesystem', diagnostics: { filesScanned: 12, maxFiles: 10, maxDepth: 4, truncated: true, unreadableDirectories: 2 } } }, new Date('2026-01-01T00:00:00.000Z'));
  const html = renderHtml({ ...report, comparison });
  assert.match(html, /Regressions/); assert.match(html, /Recoveries/); assert.match(html, /Changed evidence/); assert.match(html, /New findings/); assert.match(html, /Resolved findings/);
  assert.match(html, /Files scanned/); assert.match(html, /Unreadable directories/); assert.match(html, /Partial scan/); assert.match(html, /long\/&lt;path&gt;&amp;\.md/); assert.match(html, /<time datetime="2026-01-01T00:00:00\.000Z">/);
});
test('help documents usage, compare, outputs, local-only note, and exit codes', () => { assert.match(HELP, /Examples:/); assert.match(HELP, /--compare file/); assert.match(HELP, /baseline\.json/); assert.match(HELP, /Outputs:/); assert.match(HELP, /Exit codes:/); assert.match(HELP, /no network/); });
test('detects only non-empty evidence with relative slash paths', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'docs/guide.md', 'docs');
    assert.deepEqual((await detectEvidence(root)).readme, []);
    await writeRepositoryFile(root, 'README.md', 'readme');
    await writeRepositoryFile(root, 'LICENSE', 'license');
    await writeRepositoryFile(root, '.github/workflows/ci.yml', 'name: CI');
    await writeRepositoryFile(root, 'test/unit.spec.ts', 'test');
    await writeRepositoryFile(root, 'src/main.ts', 'export const main = true;');
    await writeRepositoryFile(root, 'CHANGELOG.md', 'changes');
    await writeRepositoryFile(root, '.gitignore', 'dist');
    await writeRepositoryFile(root, 'notes.txt', 'not README evidence');
    await writeRepositoryFile(root, 'README-empty.md', '');
    await writeRepositoryFile(root, 'empty/placeholder', '');
    const evidence = await detectEvidence(root);
    assert.deepEqual(evidence.readme, ['README.md']);
    assert.deepEqual(evidence.license, ['LICENSE']);
    assert.deepEqual(evidence.ci, ['.github/workflows/ci.yml']);
    assert.deepEqual(evidence.tests, ['test/unit.spec.ts']);
    assert.deepEqual(evidence.source, ['src/main.ts']);
    assert.deepEqual(evidence.docs, ['CHANGELOG.md', 'docs/guide.md']);
    assert.deepEqual(evidence.gitignore, ['.gitignore']);
    assert.deepEqual(evidence.metadata, []);
    for (const paths of Object.values(evidence)) for (const evidencePath of paths) {
      assert.ok(!path.isAbsolute(evidencePath));
      assert.doesNotMatch(evidencePath, /\\/);
    }
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('requires non-whitespace content and recognizes supported CI providers', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'README.md', ' \n\t ');
    await writeRepositoryFile(root, 'README.markdown', '# valid');
    await writeRepositoryFile(root, 'README.md.bak', 'backup');
    await writeRepositoryFile(root, '.gitlab-ci.yml', 'stages: [test]');
    await writeRepositoryFile(root, '.circleci/config.yml', 'version: 2.1');
    await writeRepositoryFile(root, 'Jenkinsfile', 'pipeline {}');
    await writeRepositoryFile(root, 'azure-pipelines.yml', 'trigger: none');
    await writeRepositoryFile(root, '.travis.yml', 'language: node_js');
    await writeRepositoryFile(root, 'bitbucket-pipelines.yml', 'pipelines: {}');
    await writeRepositoryFile(root, 'appveyor.yml', 'version: 1.0');
    await writeRepositoryFile(root, 'LICENSE', ' \n ');
    await writeRepositoryFile(root, 'LICENCE.txt', 'MIT');
    const evidence = await detectEvidence(root);
    assert.deepEqual(evidence.readme, ['README.markdown']);
    assert.deepEqual(evidence.license, ['LICENCE.txt']);
    assert.deepEqual(evidence.ci, ['.circleci/config.yml', '.gitlab-ci.yml', '.travis.yml', 'Jenkinsfile', 'appveyor.yml', 'azure-pipelines.yml', 'bitbucket-pipelines.yml']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('recognizes test naming forms and excludes them from source evidence', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'src/test_foo.ts', 'test');
    await writeRepositoryFile(root, 'src/test-foo.ts', 'test');
    await writeRepositoryFile(root, 'src/foo_test.ts', 'test');
    await writeRepositoryFile(root, 'src/foo.test.ts', 'test');
    await writeRepositoryFile(root, 'src/foo.spec.integration.ts', 'test');
    await writeRepositoryFile(root, 'src/foo.spec.ts', 'test');
    await writeRepositoryFile(root, 'src/feature.ts', 'source');
    const evidence = await detectEvidence(root);
    assert.deepEqual(evidence.tests, ['src/foo.spec.integration.ts', 'src/foo.spec.ts', 'src/foo.test.ts', 'src/foo_test.ts', 'src/test-foo.ts', 'src/test_foo.ts']);
    assert.deepEqual(evidence.source, ['src/feature.ts']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('scanRepository requires valid metadata and preserves malformed metadata evidence details', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'README.md', 'readme');
    await writeRepositoryFile(root, 'LICENSE', 'license');
    await writeRepositoryFile(root, 'package.json', '{ malformed');
    const malformed = await packageMetadata(root);
    assert.equal(malformed.valid, false);
    assert.equal(malformed.reference, 'package.json');
    assert.ok(malformed.error);
    const scannedMalformed = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    assert.equal(scannedMalformed.features.metadata, false);
    assert.deepEqual(scannedMalformed.evidence?.metadata, []);
    await writeRepositoryFile(root, 'package.json', JSON.stringify({ name: '  fixture-package  ', license: '  MIT  ' }));
    const metadata = await packageMetadata(root);
    assert.deepEqual(metadata, { valid: true, name: 'fixture-package', license: 'MIT', reference: 'package.json', error: null });
    const scannedValid = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    assert.equal(scannedValid.features.metadata, true);
    assert.equal(scannedValid.features.license, true);
    assert.deepEqual(scannedValid.evidence?.metadata, ['package.json']);
    assert.deepEqual(scannedValid.evidence?.license, ['LICENSE', 'package.json']);
    assert.equal(scannedValid.packageName, 'fixture-package');
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('metadata and license score require explicit non-empty values', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'package.json', JSON.stringify({ name: '   ', license: '   ' }));
    const scanned = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    assert.equal(scanned.features.metadata, false);
    assert.equal(scanned.features.license, false);
    assert.deepEqual(scanned.evidence?.metadata, []);
    assert.deepEqual(scanned.evidence?.license, []);
    assert.equal(scoreRepository(scanned, new Date('2026-01-01T00:00:00.000Z')).score, 0);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('package license is explicit license evidence without metadata name', async () => {
  const root = await tempRepository();
  try {
    await writeRepositoryFile(root, 'package.json', JSON.stringify({ license: ' MIT ' }));
    const scanned = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    assert.equal(scanned.features.metadata, false);
    assert.equal(scanned.features.license, true);
    assert.deepEqual(scanned.evidence?.metadata, []);
    assert.deepEqual(scanned.evidence?.license, ['package.json']);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('empty signal directories fail while populated signals pass', async () => {
  const root = await tempRepository();
  try {
    await mkdir(path.join(root, 'test'), { recursive: true });
    await mkdir(path.join(root, 'docs'), { recursive: true });
    await mkdir(path.join(root, '.github', 'workflows'), { recursive: true });
    const empty = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    for (const key of ['readme', 'license', 'ci', 'tests', 'source', 'docs'] as const) assert.equal(empty.features[key], false, key);
    await writeRepositoryFile(root, 'README.md', 'readme');
    await writeRepositoryFile(root, 'LICENSE', 'license');
    await writeRepositoryFile(root, '.github/workflows/check.yaml', 'name: check');
    await writeRepositoryFile(root, 'test/check.test.ts', 'test');
    await writeRepositoryFile(root, 'src/index.ts', 'export {};');
    await writeRepositoryFile(root, 'docs/index.md', 'docs');
    const populated = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    for (const key of ['readme', 'license', 'ci', 'tests', 'source', 'docs'] as const) assert.equal(populated.features[key], true, key);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('findings expose actionable keys and report keeps renderer-compatible shape', async () => {
  const root = await tempRepository();
  try {
    const scanned = await scanRepository(root, new Date('2026-01-01T00:00:00.000Z'));
    const report = scoreRepository(scanned, new Date('2026-01-01T00:00:00.000Z'));
    assert.ok(report.findings.length > 0);
    for (const finding of report.findings) {
      assert.ok(finding.key);
      assert.ok(finding.severity);
      assert.ok(finding.message);
      assert.ok(finding.action);
    }
    const parsed: unknown = JSON.parse(renderJson(report));
    assert.ok(parsed && typeof parsed === 'object');
    assert.ok(Array.isArray((parsed as { items: unknown }).items));
    assert.ok(Array.isArray((parsed as { findings: unknown }).findings));
    assert.ok((parsed as { facts: { evidence: unknown } }).facts.evidence);
    assert.match(renderMarkdown(report), /## Evidence/);
     assert.match(renderHtml(report), /<h2 id="findings-title">Findings<\/h2>/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test('gitFacts reports fixed-date activity for temporary Git repositories', async (t) => {
  const root = await tempRepository();
  try {
    try { await execFileAsync('git', ['--version']); } catch { t.skip('Git unavailable'); return; }
    await execFileAsync('git', ['init', '-q'], { cwd: root });
    await execFileAsync('git', ['config', 'user.email', 'test@example.invalid'], { cwd: root });
    await execFileAsync('git', ['config', 'user.name', 'Repomark Test'], { cwd: root });
    await writeRepositoryFile(root, 'README.md', 'git fixture');
    await execFileAsync('git', ['add', 'README.md'], { cwd: root });
    await execFileAsync('git', ['commit', '-q', '-m', 'fixture'], { cwd: root, env: { ...process.env, GIT_AUTHOR_DATE: '2025-12-30T00:00:00Z', GIT_COMMITTER_DATE: '2025-12-30T00:00:00Z' } });
    const result = await gitFacts(root, new Date('2026-01-01T00:00:00.000Z'));
    assert.equal(result.isGit, true);
    assert.equal(result.activityDays, 2);
    assert.ok(result.branch);
  } finally { await rm(root, { recursive: true, force: true }); }
});
