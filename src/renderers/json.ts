import type { ScoreReport } from '../types.js';
export function renderJson(report: ScoreReport): string { return `${JSON.stringify(report, null, 2)}\n`; }
