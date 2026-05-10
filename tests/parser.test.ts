import path from 'path';
import fs from 'fs';
import os from 'os';
import { parsePackageJson, extractDependencies } from '../src/parser';

describe('parsePackageJson', () => {
  let tmpDir: string;
  let pkgPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ndc-test-'));
    pkgPath = path.join(tmpDir, 'package.json');
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true }));

  it('parses valid package.json', () => {
    fs.writeFileSync(pkgPath, JSON.stringify({ name: 'my-app', dependencies: { lodash: '^4.0.0' } }));
    const pkg = parsePackageJson(pkgPath);
    expect(pkg.name).toBe('my-app');
    expect(pkg.dependencies?.lodash).toBe('^4.0.0');
  });

  it('throws on missing file', () => {
    expect(() => parsePackageJson('/nonexistent/package.json')).toThrow('not found');
  });

  it('throws on invalid JSON', () => {
    fs.writeFileSync(pkgPath, '{ broken json');
    expect(() => parsePackageJson(pkgPath)).toThrow('Invalid JSON');
  });
});

describe('extractDependencies', () => {
  it('skips file: and git: references', () => {
    const pkg = {
      dependencies: {
        lodash: '^4.0.0',
        local: 'file:../local',
        gitpkg: 'git+https://github.com/org/repo.git',
      },
    };
    const deps = extractDependencies(pkg, { includeDev: false, includeOptional: false, includePeer: false });
    expect(deps).toHaveLength(1);
    expect(deps[0].name).toBe('lodash');
  });

  it('separates dep types correctly', () => {
    const pkg = {
      dependencies:         { react: '^18.0.0' },
      devDependencies:      { jest: '^29.0.0' },
      optionalDependencies: { fsevents: '^2.0.0' },
    };
    const deps = extractDependencies(pkg, { includeDev: true, includeOptional: true, includePeer: false });
    expect(deps.find((d) => d.name === 'react')?.type).toBe('production');
    expect(deps.find((d) => d.name === 'jest')?.type).toBe('dev');
    expect(deps.find((d) => d.name === 'fsevents')?.type).toBe('optional');
  });
});