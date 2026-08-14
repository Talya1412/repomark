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
import type { Format } from './types.js';
export async function run(argv: readonly string[], now = new Date()): Promise<number> { const options = parseArgs(argv); if (options.help) { process.stdout.write(`${HELP}\n`); return EXIT_CODES.ok; } if (options.version) { process.stdout.write('0.1.0\n'); return EXIT_CODES.ok; } const report = scoreRepository(await scanRepository(options.path, now), now); const renderers: Readonly<Record<Format, () => string>> = { terminal: () => renderTerminal(report, options.color), json: () => renderJson(report), html: () => renderHtml(report), markdown: () => renderMarkdown(report), badge: () => renderBadge(report) }; await writeOutput(options.output, renderers[options.format]()); if (options.badgeOutput !== null) await writeOutput(options.badgeOutput, renderBadge(report)); return options.threshold !== null && report.score < options.threshold ? EXIT_CODES.threshold : EXIT_CODES.ok; }
