import path from 'path';
import { parsePackageJson, extractDependencies } from './parser';
import { RegistryClient } from './registry';
import { analyzeAll } from './analyzer';
import { ScanOptions, ScanReport } from './types';

export async function scan(options: ScanOptions): Promise<ScanReport> {
  const pkg = parsePackageJson(options.packageJsonPath);

  const deps = extractDependencies(pkg, {
    includeDev:      options.includeDevDependencies,
    includeOptional: options.includeOptionalDependencies,
    includePeer:     options.includePeerDependencies,
  });

  const client = new RegistryClient(options.cacheDir);

  const results = await analyzeAll(deps, client, options.concurrency);

  const report: ScanReport = {
    scannedAt:          new Date().toISOString(),
    packageJsonPath:    path.resolve(options.packageJsonPath),
    totalScanned:       results.length,
    deprecatedCount:    results.filter((r) => r.isDeprecated).length,
    majorOutdatedCount: results.filter((r) => r.isMajorOutdated && !r.isDeprecated).length,
    preReleaseCount:    results.filter((r) => r.isPreRelease).length,
    errorCount:         results.filter((r) => !!r.error).length,
    results,
  };

  return report;
}