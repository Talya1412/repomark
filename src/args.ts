import type { Format } from './types.js';
export type CliOptions = Readonly<{ path: string; format: Format; output: string | null; badgeOutput: string | null; compare: string | null; threshold: number | null; color: boolean; help: boolean; version: boolean }>;
export class UsageError extends Error {}
const formats = new Set<Format>(['terminal', 'json', 'html', 'markdown', 'badge']);
const isFormat = (value: string): value is Format => formats.has(value as Format);
export function parseArgs(argv: readonly string[]): CliOptions {
  let repositoryPath: string | undefined;
  let format: Format = 'terminal';
  let output: string | null = null;
  let badgeOutput: string | null = null;
  let compare: string | null = null;
  let threshold: number | null = null;
  let color = true;
  let help = false;
  let version = false;

  const requiredValue = (option: string, value: string | undefined): string => {
    if (value === undefined || value.startsWith('-')) throw new UsageError(`${option} requires a value`);
    return value;
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === undefined) continue;

    switch (arg) {
      case '--help':
      case '-h':
        help = true;
        break;
      case '--version':
      case '-v':
        version = true;
        break;
      case '--no-color':
        color = false;
        break;
      case '--format': {
        const value = requiredValue(arg, argv[++i]);
        if (!isFormat(value)) throw new UsageError('format must be one of terminal, json, html, markdown, badge');
        format = value;
        break;
      }
      case '--output':
        output = requiredValue(arg, argv[++i]);
        break;
      case '--badge-output':
        badgeOutput = requiredValue(arg, argv[++i]);
        break;
      case '--compare':
        compare = requiredValue(arg, argv[++i]);
        break;
      case '--threshold': {
        const raw = requiredValue(arg, argv[++i]);
        const value = Number(raw);
        if (raw.trim() === '' || !Number.isInteger(value) || value < 0 || value > 100) {
          throw new UsageError('threshold must be an integer from 0 to 100');
        }
        threshold = value;
        break;
      }
      default:
        if (arg.startsWith('-')) throw new UsageError(`unknown option: ${arg}`);
        if (repositoryPath !== undefined) throw new UsageError('only one repository path is allowed');
        repositoryPath = arg;
    }
  }
  return { path: repositoryPath ?? '.', format, output, badgeOutput, compare, threshold, color, help, version };
}
export const HELP = `repomark - local, deterministic repository health report\n\nUsage:\n  repomark [path] [options]\n\nExamples:\n  repomark .\n  repomark ./project --format markdown --output report.md\n  repomark . --format html --compare baseline.json\n  repomark . --threshold 75 --no-color\n\nOptions:\n  --format terminal|json|html|markdown|badge\n                         Select output format (terminal by default)\n  --output file          Write primary report to file\n  --badge-output file    Write SVG badge to file\n  --compare file         Compare current report with a JSON ScoreReport\n  --threshold 0..100    Exit with threshold status when score is below value\n  --no-color             Disable terminal color\n  --help                 Show help\n  --version              Show version\n\nOutputs:\n  terminal               Human-readable score, evidence, and findings\n  markdown               Shareable report with evidence and actions\n  html                   Self-contained report for a browser\n  json                   Additive machine-readable ScoreReport\n  badge                  190x20 SVG score badge\n\nScoring uses local repository heuristics and fixed weighted signals. Findings explain missing signals and suggest actions.\n\nExit codes:\n  0  Report generated; threshold met or not requested\n  1  Report generated; score below --threshold\n  2  Invalid CLI usage\n  3  Repository scan or output failure\n\nLocal-only note: repomark reads selected files and local Git metadata. It makes no network or service requests. Heuristics are not a quality, security, or popularity guarantee.`;
