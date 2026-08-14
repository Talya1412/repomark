import { parseArgs, HELP } from './args.js';
import { EXIT_CODES } from './exit-codes.js';
import { scanRepository } from './repository/scan-repository.js';
import { scoreRepository } from './scoring/score-repository.js';
import { renderTerminal } from './renderers/terminal.js';
import { renderJson } from './renderers/json.js';
import { renderHtml } from './renderers/html.js';
import { renderMarkdown } from './renderers/markdown.js';
import { renderBadge } from './renderers/badge.js';
import { writeOutput } from './output/write-output.js';
import { readFile } from 'node:fs/promises';
import { compareReports } from './comparison.js';
import type { Format, ScoreReport } from './types.js';
import { isScoreReport } from './report-contract.js';
export async function run(argv: readonly string[], now = new Date()): Promise<number> {
  const options = parseArgs(argv); if (options.help) { process.stdout.write(`${HELP}\n`); return EXIT_CODES.ok; } if (options.version) { process.stdout.write('0.1.0\n'); return EXIT_CODES.ok; }
  const report = scoreRepository(await scanRepository(options.path, now), now);
  const finalReport = options.compare === null ? report : { ...report, comparison: compareReports(report, await loadBaseline(options.compare), options.compare) };
  const status = { passed: options.threshold === null || finalReport.score >= options.threshold, exitCode: (options.threshold !== null && finalReport.score < options.threshold ? EXIT_CODES.threshold : EXIT_CODES.ok) as 0 | 1, threshold: options.threshold };
  const renderers: Readonly<Record<Format, () => string>> = { terminal: () => renderTerminal(finalReport, options.color), json: () => renderJson(finalReport, status), html: () => renderHtml(finalReport), markdown: () => renderMarkdown(finalReport), badge: () => renderBadge(finalReport) };
  await writeOutput(options.output, renderers[options.format]()); if (options.badgeOutput !== null) await writeOutput(options.badgeOutput, renderBadge(finalReport)); return status.exitCode;
}
async function loadBaseline(file: string): Promise<ScoreReport> {
  let parsed: unknown;
  try { parsed = JSON.parse(await readFile(file, 'utf8')); } catch { throw new Error(`invalid baseline report: ${file}`); }
  if (!isScoreReport(parsed)) throw new Error(`invalid baseline report: ${file}`);
  return parsed;
}
