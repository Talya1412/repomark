import { escapeMarkdown } from './escape.js';
import type { ScoreReport } from '../types.js';
export function renderMarkdown(report: ScoreReport): string {
  const rows = report.items.map((item) => `| ${escapeMarkdown(item.label)} | ${item.earned}/${item.points} | ${item.present ? 'present' : 'missing'} |`).join('\n');
  const evidence = report.items.map((item) => {
    const paths = report.facts.evidence?.[item.key] ?? [];
    return `- **${escapeMarkdown(item.label)}:** ${paths.length > 0 ? paths.map(escapeMarkdown).join(', ') : 'none'}`;
  }).join('\n');
  const findings = report.findings.length > 0
    ? report.findings.map((finding) => `- **${escapeMarkdown(finding.severity.toUpperCase())}:** ${escapeMarkdown(finding.message)} **Action:** ${escapeMarkdown(finding.action)}`).join('\n')
    : '- None';
  return `# repomark: ${escapeMarkdown(report.name)}\n\n**Score:** ${report.score}/100 (**${report.grade}**)  \n**Generated:** ${escapeMarkdown(report.generatedAt)}\n\n| Area | Points | Status |\n| --- | ---: | --- |\n${rows}\n\n## Evidence\n\n${evidence}\n\n## Findings\n\n${findings}\n`;
}
