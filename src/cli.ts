#!/usr/bin/env node
import { Command } from 'commander';
import path from 'path';
import { scan } from './scanner';
import { printReport, formatJson } from './reporter';
import { ScanOptions } from './types';

const program = new Command();

program
  .name('npm-deprecation-checker')
  .description('Scan your package.json for deprecated or outdated npm packages')
  .version('0.1.0')
  .option('-p, --path <path>',         'Path to package.json',        './package.json')
  .option('--no-dev',                   'Exclude devDependencies')
  .option('--include-optional',         'Include optionalDependencies', false)
  .option('--include-peer',             'Include peerDependencies',     false)
  .option('--strict',                   'Exit with code 1 if any issue found', false)
  .option('--json',                     'Output as JSON',               false)
  .option('--no-color',                 'Disable colored output')
  .option('--concurrency <number>',     'Parallel registry requests',   '10')
  .option('--cache <dir>',             'Directory for response cache')
  .action(async (opts) => {
    const options: ScanOptions = {
      packageJsonPath:           path.resolve(opts.path),
      includeDevDependencies:    opts.dev !== false,
      includeOptionalDependencies: opts.includeOptional,
      includePeerDependencies:   opts.includePeer,
      strict:                    opts.strict,
      json:                      opts.json,
      noColor:                   opts.color === false,
      concurrency:               parseInt(opts.concurrency, 10),
      cacheDir:                  opts.cache,
    };

    try {
      const report = await scan(options);

      if (options.json) {
        process.stdout.write(formatJson(report));
      } else {
        printReport(report, options.noColor);
      }

      // Exit code logic
      const hasIssues =
        report.deprecatedCount > 0 ||
        report.errorCount > 0 ||
        (options.strict && (report.majorOutdatedCount > 0 || report.preReleaseCount > 0));

      process.exit(hasIssues ? 1 : 0);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\nError: ${msg}\n`);
      process.exit(2);
    }
  });

program.parse();