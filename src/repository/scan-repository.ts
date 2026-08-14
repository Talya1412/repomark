import path from 'node:path';
import { detectEvidence } from './detection.js';
import { gitFacts } from './git.js';
import { packageMetadata } from './package-metadata.js';
import type { FeatureKey, FeatureMap, RepositoryFacts } from '../types.js';

export async function scanRepository(root: string, now = new Date()): Promise<RepositoryFacts> {
  const absolute = path.resolve(root);
  const [gitInfo, metadata, detected] = await Promise.all([gitFacts(absolute, now), packageMetadata(absolute), detectEvidence(absolute)]);
  const evidence = { ...detected, license: [...detected.license, ...(metadata.valid && metadata.license ? ['package.json'] : [])].sort(), metadata: metadata.valid && metadata.name ? detected.metadata : [] };
  const keys: readonly FeatureKey[] = ['readme', 'license', 'gitignore', 'ci', 'tests', 'metadata', 'source', 'docs', 'activity'];
  const features = Object.fromEntries(keys.map((key) => [key, key === 'activity' ? gitInfo.activityDays !== null && gitInfo.activityDays <= 180 : evidence[key].length > 0])) as FeatureMap;
  return { path: absolute, name: metadata.name ?? path.basename(absolute), isGit: gitInfo.isGit, features, evidence, activityDays: gitInfo.activityDays, gitBranch: gitInfo.branch, packageName: metadata.name, packageMetadata: metadata };
}
