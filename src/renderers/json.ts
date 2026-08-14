import type { JsonStatus, ScoreReport } from '../types.js';
export function renderJson(report: ScoreReport, status?: JsonStatus): string { return `${JSON.stringify(status === undefined ? report : { ...report, status }, null, 2)}\n`; }
