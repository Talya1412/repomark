# repomark

Local, deterministic repository health reports. No network, credentials, hosted dashboard, or fake popularity metrics.

## Quick start

```sh
npm install
npm run build
node dist/src/cli.js .
```

Run against any local repository. `npx repomark .` also works after package installation.

## Demo

[Watch demo](docs/repomark-demo.mp4)

Regenerate demo video and lightweight GIF locally with PowerShell (requires `ffmpeg` on `PATH`):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\demo-video.ps1
```

## Options

```text
repomark [path] [--format terminal|json|html|markdown|badge]
                 [--output file] [--badge-output file]
                 [--threshold 0..100] [--no-color] [--help] [--version]
```

Reports inspect only local files and Git metadata. `--threshold` returns exit code 1 when score is below threshold.

## Formats

`terminal` prints a readable score table, evidence under each signal, and actionable findings. `markdown` creates a shareable report. `html` creates a self-contained browser report. `json` returns the complete additive `ScoreReport`, including `facts.evidence`, `findings`, and `generatedAt`. `badge` writes a 190x20 SVG badge. Use `--output` for the primary format and `--badge-output` to write a badge alongside any primary report.

## Scoring

| Area | Points |
| --- | ---: |
| README | 15 |
| License | 10 |
| `.gitignore` | 5 |
| CI | 15 |
| Tests | 15 |
| Package metadata | 10 |
| Source | 10 |
| Docs | 10 |
| Recent activity | 10 |

Each present signal earns its fixed points; missing signals earn zero. Grades: A (90+), B (75+), C (60+), D (40+), F (below 40). Evidence lists detected local paths supporting each signal. Findings list missing or stale signals with low, medium, or high severity and a suggested action.

## Exit codes

| Code | Meaning |
| ---: | --- |
| 0 | Report generated; threshold met or not requested |
| 1 | Report generated; score below `--threshold` |
| 2 | Invalid CLI usage |
| 3 | Repository scan or output failure |

## Privacy and limitations

Repomark scans the selected local directory only. It never sends files or runs network requests. Heuristics detect common repository signals, not project quality. Scanning skips common generated/dependency directories and caps traversal depth/files. Recent activity depends on local Git history. A score is not a star-count guarantee, ranking, or security audit.

## Development

Use Node 20+, then run `npm install`, `npm test`, `npm run build`, and `npm run check`. Contributions should preserve deterministic scoring, output escaping, badge dimensions, and zero runtime dependencies.
