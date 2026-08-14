import { SCORE_RULES } from './score-rules.js';
import { buildFindings } from './findings.js';
import type { Grade, RepositoryFacts, ScoreReport } from '../types.js';
import { REPORT_CONTRACT } from '../report-contract.js';
export function gradeFor(score: number): Grade { if (score >= 90) return 'A'; if (score >= 75) return 'B'; if (score >= 60) return 'C'; if (score >= 40) return 'D'; return 'F'; }
export function scoreRepository(facts: RepositoryFacts, now: Date): ScoreReport { const items = SCORE_RULES.map((rule) => { const present = rule.evaluate(facts); return { key: rule.key, label: rule.label, points: rule.points, earned: present ? rule.points : 0, present }; }); const score = items.reduce((total, item) => total + item.earned, 0); return { path: facts.path, name: facts.name, score, grade: gradeFor(score), items, findings: buildFindings(facts), facts, generatedAt: now.toISOString(), contract: REPORT_CONTRACT }; }
