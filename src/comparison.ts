import type { Comparison, ScoreReport } from './types.js';
export function compareReports(current: ScoreReport, baseline: ScoreReport, baselineSource?: string): Comparison {
  const regressions = current.items.filter((item) => { const old = baseline.items.find((candidate) => candidate.key === item.key); return old !== undefined && old.present && !item.present; }).map((item) => item.label);
  const recoveries = current.items.filter((item) => { const old = baseline.items.find((candidate) => candidate.key === item.key); return old !== undefined && !old.present && item.present; }).map((item) => item.label);
  const changedEvidence = current.items.flatMap((item) => JSON.stringify(baseline.facts.evidence?.[item.key] ?? []) === JSON.stringify(current.facts.evidence?.[item.key] ?? []) ? [] : [item.label]);
  const oldFindings = new Set(baseline.findings.map((finding) => finding.key));
  const newFindings = current.findings.filter((finding) => !oldFindings.has(finding.key)).map((finding) => finding.key);
  const currentFindings = new Set(current.findings.map((finding) => finding.key));
  const resolvedFindings = baseline.findings.filter((finding) => !currentFindings.has(finding.key)).map((finding) => finding.key);
  const currentDiagnostics = current.facts.provenance?.diagnostics;
  const baselineDiagnostics = baseline.facts.provenance?.diagnostics;
  const compatibility = baseline.contract === undefined ? 'legacy' : baseline.contract.name === current.contract?.name && baseline.contract.version === current.contract?.version ? 'compatible' : 'incompatible';
  const metadata = { ...(baselineSource === undefined ? {} : { baselineSource }), compatibility, diagnosticsChanged: JSON.stringify(currentDiagnostics ?? null) !== JSON.stringify(baselineDiagnostics ?? null) } as const;
  return { baselineScore: baseline.score, scoreDelta: current.score - baseline.score, baselineGrade: baseline.grade, regressions, recoveries, changedEvidence, newFindings, resolvedFindings, metadata };
}
