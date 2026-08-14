import type { FeatureKey, Grade, RepositoryFacts, ScoreItem, ScoreReport } from '../types.js';
export type Rule = Readonly<{ key: FeatureKey; label: string; points: number; evaluate: (facts: RepositoryFacts) => boolean }>;
export type { Grade, RepositoryFacts, ScoreItem, ScoreReport };
