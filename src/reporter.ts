import chalk from 'chalk';
import { PackageResult, ScanReport } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function badge(type: PackageResult['type']): string {
  const map: Record<PackageResult['type'], string> = {
    production: chalk.bgRed.white(' PROD '),
    dev: chalk.bgBlue.white(' DEV  '),
    optional: chalk.bgYellow.black(' OPT  '),
    peer: chalk.bgMagenta.white(' PEER '),
  };
  return map[type];
}

function statusIcon(result: PackageResult): string {
  if (result.error)          return chalk.gray('✗');
  if (result.isDeprecated)   return chalk.red('✖');
  if (result.isMajorOutdated) return chalk.yellow('⚠');
  if (result.isPreRelease)   return chalk.cyan('◎');
  return chalk.green('✔');
}

// ── CLI Reporter ──────────────────────────────────────────────────────────────

export function printReport(report: ScanReport, noColor = false): void {
  if (noColor) chalk.level = 0;

  const issues = report.results.filter(
    (r) => r.isDeprecated || r.isMajorOutdated || r.isPreRelease || r.error
  );

  console.log('');
  console.log(chalk.bold('npm-deprecation-checker') + chalk.gray(` — ${report.scannedAt}`));
  console.log(chalk.gray(`Scanned: ${report.packageJsonPath}`));
  console.log(chalk.gray(`Total packages: ${report.totalScanned}`));
  console.log('');

  if (issues.length === 0) {
    console.log(chalk.green.bold('✔ All packages look good!'));
    console.log('');
    return;
  }

  // Summary line
  const parts: string[] = [];
  if (report.deprecatedCount)    parts.push(chalk.red(`${report.deprecatedCount} deprecated`));
  if (report.majorOutdatedCount) parts.push(chalk.yellow(`${report.majorOutdatedCount} major outdated`));
  if (report.preReleaseCount)    parts.push(chalk.cyan(`${report.preReleaseCount} pre-release`));
  if (report.errorCount)         parts.push(chalk.gray(`${report.errorCount} errors`));
  console.log(chalk.bold('Issues found: ') + parts.join(chalk.gray(' · ')));
  console.log('');

  // Table header
  const col = { icon: 2, name: 35, range: 14, latest: 14, type: 8 };
  console.log(
    chalk.dim(
      ' '.padEnd(col.icon) +
      'Package'.padEnd(col.name) +
      'Range'.padEnd(col.range) +
      'Latest'.padEnd(col.latest) +
      'Type'
    )
  );
  console.log(chalk.dim('─'.repeat(90)));

  for (const r of issues) {
    const icon   = statusIcon(r);
    const name   = r.name.length > col.name - 2 ? r.name.slice(0, col.name - 3) + '…' : r.name;
    const range  = r.versionRange.slice(0, col.range - 2);
    const latest = (r.latestVersion ?? 'N/A').slice(0, col.latest - 2);

    console.log(
      `${icon} ` +
      name.padEnd(col.name) +
      chalk.gray(range.padEnd(col.range)) +
      chalk.green(latest.padEnd(col.latest)) +
      badge(r.type)
    );

    if (r.suggestion) {
      console.log(`   ${chalk.dim('→')} ${chalk.italic(r.suggestion)}`);
    }
    if (r.error) {
      console.log(`   ${chalk.dim('!')} ${chalk.gray(r.error)}`);
    }
  }

  console.log('');
}

// ── JSON Reporter ─────────────────────────────────────────────────────────────

export function formatJson(report: ScanReport): string {
  return JSON.stringify(report, null, 2);
}