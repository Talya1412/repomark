import { escapeHtml } from './escape.js';
import type { ScoreReport } from '../types.js';
export function renderHtml(report: ScoreReport): string {
  const rows = report.items.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td>${item.earned}/${item.points}</td><td>${item.present ? 'present' : 'missing'}</td></tr>`).join('');
  const evidence = report.items.map((item) => {
    const paths = report.facts.evidence?.[item.key] ?? [];
    return `<li><strong>${escapeHtml(item.label)}</strong>: ${paths.length > 0 ? paths.map(escapeHtml).join(', ') : 'none'}</li>`;
  }).join('');
  const findings = report.findings.length > 0
    ? report.findings.map((finding) => `<li class="severity-${finding.severity}"><strong>${escapeHtml(finding.severity.toUpperCase())}</strong>: ${escapeHtml(finding.message)} <span><strong>Action:</strong> ${escapeHtml(finding.action)}</span></li>`).join('')
    : '<li>None</li>';
  return `<!doctype html><html><head><meta charset="utf-8"><title>repomark - ${escapeHtml(report.name)}</title><style>body{font:16px system-ui;max-width:720px;margin:3rem auto;padding:0 1rem;color:#17202a}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:.6rem;text-align:left}.score{font-size:3rem}.severity-low{color:#087f5b}.severity-medium{color:#9a6700}.severity-high{color:#cf222e}li{margin:.5rem 0}li span{display:block;color:#17202a}</style></head><body><h1>repomark</h1><p>${escapeHtml(report.name)}</p><p class="score">${report.score}/100 <strong>${report.grade}</strong></p><p>Generated: ${escapeHtml(report.generatedAt)}</p><table><thead><tr><th>Area</th><th>Points</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><h2>Evidence</h2><ul>${evidence}</ul><h2>Findings</h2><ul>${findings}</ul></body></html>\n`;
}
