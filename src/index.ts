// Public API — use npm-deprecation-checker programmatically in any JS/TS project
export { scan } from './scanner';
export { printReport, formatJson } from './reporter';
export type {
  Dependency,
  PackageResult,
  ScanOptions,
  ScanReport,
} from './types';