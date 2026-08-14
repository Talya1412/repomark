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
  const comparison = report.comparison ? `\n## Comparison\n\n- Score delta: ${report.comparison.scoreDelta >= 0 ? '+' : ''}${report.comparison.scoreDelta}\n- Regressions: ${report.comparison.regressions.length}\n- Recoveries: ${report.comparison.recoveries.length}\n- Changed evidence: ${report.comparison.changedEvidence.length}\n${report.comparison.metadata ? `- Compatibility: ${escapeMarkdown(report.comparison.metadata.compatibility)}\n- Diagnostics changed: ${report.comparison.metadata.diagnosticsChanged}\n${report.comparison.metadata.baselineSource === undefined ? '' : `- Baseline source: ${escapeMarkdown(report.comparison.metadata.baselineSource)}\n`}` : ''}` : '';
  const diagnostics = report.facts.provenance ? (() => { const value = report.facts.provenance.diagnostics; const causes = [value.fileLimitReached ? 'file limit' : '', value.depthLimitReached ? 'depth limit' : ''].filter(Boolean); const unreadable = value.unreadableFiles ?? []; return `\n## Diagnostics\n\n- Files scanned: ${value.filesScanned}\n- Limits: ${value.maxFiles} files, depth ${value.maxDepth}\n- Limit causes: ${causes.length > 0 ? causes.map(escapeMarkdown).join(', ') : 'none'}\n- Unreadable files: ${unreadable.length > 0 ? `${unreadable.length} (${unreadable.map(escapeMarkdown).join(', ')})` : '0'}\n`; })() : '';
  const contract = report.contract ? `\n## Report contract\n\n- Name: ${escapeMarkdown(report.contract.name)}\n- Version: ${report.contract.version}\n` : '';
  const status = report.status ? `\n## JSON status\n\n- Passed: ${report.status.passed}\n- Exit code: ${report.status.exitCode}\n- Threshold: ${report.status.threshold === null ? 'none' : report.status.threshold}\n` : '';
  return `# repomark: ${escapeMarkdown(report.name)}\n${contract}${status}\n**Score:** ${report.score}/100 (**${escapeMarkdown(report.grade)}**)  \n**Generated:** ${escapeMarkdown(report.generatedAt)}\n\n| Area | Points | Status |\n| --- | ---: | --- |\n${rows}\n\n## Evidence\n\n${evidence}\n\n## Findings\n\n${findings}\n${diagnostics}${comparison}`;
}
