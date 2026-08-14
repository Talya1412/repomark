import type { FeatureKey, Finding, RepositoryFacts } from '../types.js';

const definitions: Readonly<Record<FeatureKey, Readonly<{ severity: Finding['severity']; message: string; action: string }>>> = {
  readme: { severity: 'medium', message: 'Root README is missing or empty.', action: 'Add a non-empty README.md at repository root.' },
  license: { severity: 'medium', message: 'License evidence is missing.', action: 'Add a license file or a valid package.json license.' },
  gitignore: { severity: 'low', message: '.gitignore is missing or empty.', action: 'Add a non-empty .gitignore for generated and local files.' },
  ci: { severity: 'medium', message: 'CI workflow evidence is missing.', action: 'Add a non-empty .github/workflows/*.yml or *.yaml workflow.' },
  tests: { severity: 'high', message: 'Test evidence is missing.', action: 'Add non-empty test files or test suites.' },
  metadata: { severity: 'medium', message: 'Valid package metadata is missing.', action: 'Add a valid package.json with a non-empty name.' },
  source: { severity: 'high', message: 'Source file evidence is missing.', action: 'Add non-empty source files in a supported language.' },
  docs: { severity: 'low', message: 'Documentation evidence is missing.', action: 'Add non-empty docs or contributor documentation.' },
  activity: { severity: 'low', message: 'Recent Git activity is missing or stale.', action: 'Make a recent commit in this repository.' },
};

export function buildFindings(facts: RepositoryFacts): readonly Finding[] {
  const keys: readonly FeatureKey[] = ['readme', 'license', 'gitignore', 'ci', 'tests', 'metadata', 'source', 'docs', 'activity'];
  return keys.filter((key) => !facts.features[key]).map((key) => ({ key, ...definitions[key] }));
}
