import type { EvidenceMap, ScoreReport } from '../types.js';
export function renderTerminal(report: ScoreReport, color: boolean): string {
  const paint = (text: string, code: string): string => color ? `\u001b[${code}m${text}\u001b[0m` : text;
  const passed = report.items.filter((item) => item.present).length;
  const lines = [`${paint('repomark', '1')} ${report.name}`, `Score: ${paint(`${report.score}/100`, report.score >= 75 ? '32' : '33')}  Grade: ${report.grade}`, `Readiness: ${passed}/${report.items.length} checks passing, ${report.findings.length} actions`, ''];
  const evidence: Partial<EvidenceMap> = report.facts.evidence ?? {};
  for (const item of report.items) {
    lines.push(`${item.present ? 'PASS' : 'MISS'} ${item.label.padEnd(18)} ${item.earned}/${item.points}`);
    const paths = evidence[item.key] ?? [];
    lines.push(`  Evidence: ${paths.length > 0 ? paths.join(', ') : 'none'}`);
  }
  lines.push('', 'Findings');
  if (report.findings.length === 0) lines.push('  None');
  for (const finding of report.findings) {
    lines.push(`  [${paint(finding.severity.toUpperCase(), finding.severity === 'high' ? '31' : finding.severity === 'medium' ? '33' : '36')}] ${finding.message}`, `    Action: ${finding.action}`);
  }
  if (report.facts.provenance) {
    const diagnostics = report.facts.provenance.diagnostics;
    lines.push('', 'Diagnostics', `  Files scanned: ${diagnostics.filesScanned}`, `  Traversal: max ${diagnostics.maxFiles} files, depth ${diagnostics.maxDepth}${diagnostics.truncated ? ' (limit reached)' : ''}`);
    if (diagnostics.fileLimitReached || diagnostics.depthLimitReached) lines.push(`  Limit causes: ${[diagnostics.fileLimitReached ? 'file limit' : '', diagnostics.depthLimitReached ? 'depth limit' : ''].filter(Boolean).join(', ')}`);
    const unreadableFiles = diagnostics.unreadableFiles ?? [];
    lines.push(`  Unreadable files: ${unreadableFiles.length}${unreadableFiles.length > 0 ? ` (${unreadableFiles.join(', ')})` : ''}`);
  }
  if (report.comparison) {
    const metadata = report.comparison.metadata;
    lines.push('', 'Comparison', `  Score delta: ${report.comparison.scoreDelta >= 0 ? '+' : ''}${report.comparison.scoreDelta}`, `  Regressions: ${report.comparison.regressions.length}`, `  Recoveries: ${report.comparison.recoveries.length}`);
    if (metadata) {
      lines.push(`  Compatibility: ${metadata.compatibility}`, `  Diagnostics changed: ${metadata.diagnosticsChanged}`);
      if (metadata.baselineSource !== undefined) lines.push(`  Baseline source: ${metadata.baselineSource}`);
    }
  }
  return `${lines.join('\n')}\n`;
}
