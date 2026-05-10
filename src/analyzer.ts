import semver from 'semver';
import { Dependency, PackageResult } from './types';
import { RegistryClient, NpmPackageData, pLimit } from './registry';

export async function analyzePackage(
  dep: Dependency,
  client: RegistryClient
): Promise<PackageResult> {
  const base: PackageResult = {
    name: dep.name,
    versionRange: dep.versionRange,
    type: dep.type,
    latestVersion: null,
    isDeprecated: false,
    deprecationMessage: null,
    isMajorOutdated: false,
    isPreRelease: false,
    suggestion: null,
    error: null,
  };

  try {
    const data: NpmPackageData = await client.fetchPackage(dep.name);
    const latestVersion = data['dist-tags'].latest;
    base.latestVersion = latestVersion;

    // ── Deprecation check ──────────────────────────────────────────────────
    const latestMeta = data.versions[latestVersion];
    const deprecatedField = latestMeta?.deprecated;
    if (typeof deprecatedField === 'string' && deprecatedField.length > 0) {
      base.isDeprecated = true;
      base.deprecationMessage = deprecatedField;
}

    // ── Version checks ────────────────────────────────────────────────────
    const cleanRange  = semver.validRange(dep.versionRange);
    const cleanLatest = semver.valid(latestVersion);

    if (cleanRange && cleanLatest) {
      // Pre-release: range pins ke pre-release version
      const minVersion = semver.minVersion(cleanRange);
      if (minVersion && semver.prerelease(minVersion)) {
        base.isPreRelease = true;
      }

      // Major outdated: latest major > resolved max major
      const resolvedMax = semver.maxSatisfying(
        Object.keys(data.versions),
        cleanRange
      );
      if (resolvedMax) {
        const resolvedMajor = semver.major(resolvedMax);
        const latestMajor   = semver.major(cleanLatest);
        if (latestMajor > resolvedMajor) {
          base.isMajorOutdated = true;
        }
      }
    }

    // ── Build suggestion ──────────────────────────────────────────────────
    if (base.isDeprecated) {
      base.suggestion = `Package is deprecated. Message: "${base.deprecationMessage}"`;
    } else if (base.isMajorOutdated) {
      base.suggestion = `Update to latest: ^${latestVersion}`;
    } else if (base.isPreRelease) {
      base.suggestion = `Pinned to a pre-release. Consider upgrading to stable: ^${latestVersion}`;
    }

  } catch (err: unknown) {
    base.error =
      err instanceof Error ? err.message : 'Unknown error fetching package';
  }

  return base;
}

export async function analyzeAll(
  deps: Dependency[],
  client: RegistryClient,
  concurrency: number
): Promise<PackageResult[]> {
  const tasks = deps.map((dep) => () => analyzePackage(dep, client));
  return pLimit(tasks, concurrency);
}