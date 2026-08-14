import type { ReportContract, ScoreReport } from './types.js';

export const REPORT_CONTRACT_NAME = 'repomark' as const;
export const REPORT_CONTRACT_VERSION = 1 as const;
export const REPORT_CONTRACT: ReportContract = { name: REPORT_CONTRACT_NAME, version: REPORT_CONTRACT_VERSION };

const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';

export function isScoreReport(value: unknown): value is ScoreReport {
  if (!isRecord(value)) return false;
  const report = value;
  if (typeof report['path'] !== 'string' || typeof report['name'] !== 'string' || typeof report['score'] !== 'number' || !Number.isFinite(report['score']) || !['A', 'B', 'C', 'D', 'F'].includes(report['grade'] as string) || typeof report['generatedAt'] !== 'string' || !Array.isArray(report['items']) || !Array.isArray(report['findings']) || !isRecord(report['facts'])) return false;
  if (!report['facts']['features'] || typeof report['facts']['features'] !== 'object') return false;
  if (!report['items'].every((item: unknown) => isRecord(item) && typeof item['key'] === 'string' && typeof item['label'] === 'string' && typeof item['points'] === 'number' && typeof item['earned'] === 'number' && typeof item['present'] === 'boolean')) return false;
  if (!report['findings'].every((finding: unknown) => isRecord(finding) && typeof finding['key'] === 'string' && typeof finding['severity'] === 'string' && typeof finding['message'] === 'string' && typeof finding['action'] === 'string')) return false;
  if (report['contract'] !== undefined) {
    if (!isRecord(report['contract'])) return false;
    if (report['contract']['name'] !== REPORT_CONTRACT_NAME || report['contract']['version'] !== REPORT_CONTRACT_VERSION) return false;
  }
  return true;
}
