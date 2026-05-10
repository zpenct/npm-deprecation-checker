import fs from 'fs';
import path from 'path';
import { Dependency } from './types';

export interface ParsedPackageJson {
  name?: string;
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
}

export function parsePackageJson(filePath: string): ParsedPackageJson {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`package.json not found at: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, 'utf-8');

  try {
    return JSON.parse(raw) as ParsedPackageJson;
  } catch {
    throw new Error(`Invalid JSON in package.json at: ${resolved}`);
  }
}

export function extractDependencies(
  pkg: ParsedPackageJson,
  options: {
    includeDev: boolean;
    includeOptional: boolean;
    includePeer: boolean;
  }
): Dependency[] {
  const deps: Dependency[] = [];

  const add = (
    record: Record<string, string> | undefined,
    type: Dependency['type']
  ) => {
    if (!record) return;
    for (const [name, versionRange] of Object.entries(record)) {
      // Skip local file, git, atau URL references
      if (
        versionRange.startsWith('file:') ||
        versionRange.startsWith('git') ||
        versionRange.startsWith('http')
      ) {
        continue;
      }
      deps.push({ name, versionRange, type });
    }
  };

  add(pkg.dependencies, 'production');
  if (options.includeDev)      add(pkg.devDependencies, 'dev');
  if (options.includeOptional) add(pkg.optionalDependencies, 'optional');
  if (options.includePeer)     add(pkg.peerDependencies, 'peer');

  return deps;
}