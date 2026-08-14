import type { EvidenceMap, ScoreReport } from '../types.js';
export function renderTerminal(report: ScoreReport, color: boolean): string {
  const paint = (text: string, code: string): string => color ? `\u001b[${code}m${text}\u001b[0m` : text;
  const lines = [`${paint('repomark', '1')} ${report.name}`, `Score: ${paint(`${report.score}/100`, report.score >= 75 ? '32' : '33')}  Grade: ${report.grade}`, ''];
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
  return `${lines.join('\n')}\n`;
}
