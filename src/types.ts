export interface Dependency {
  name: string;
  versionRange: string;
  type: 'production' | 'dev' | 'optional' | 'peer';
}

export interface PackageResult {
  name: string;
  versionRange: string;
  type: Dependency['type'];
  latestVersion: string | null;
  isDeprecated: boolean;
  deprecationMessage: string | null;
  isMajorOutdated: boolean;
  isPreRelease: boolean;
  suggestion: string | null;
  error: string | null;
}

export interface ScanOptions {
  packageJsonPath: string;
  includeDevDependencies: boolean;
  includeOptionalDependencies: boolean;
  includePeerDependencies: boolean;
  strict: boolean;
  json: boolean;
  noColor: boolean;
  concurrency: number;
  cacheDir: string | null;
}

export interface ScanReport {
  scannedAt: string;
  packageJsonPath: string;
  totalScanned: number;
  deprecatedCount: number;
  majorOutdatedCount: number;
  preReleaseCount: number;
  errorCount: number;
  results: PackageResult[];
}