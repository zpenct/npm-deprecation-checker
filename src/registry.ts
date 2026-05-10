import axios, { AxiosInstance } from 'axios';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { z } from 'zod';

const NpmPackageSchema = z.object({
  name: z.string(),
  'dist-tags': z.object({ latest: z.string() }).passthrough(),
  versions: z.record(
  z.string(),
  z.object({
    deprecated: z.union([z.string(), z.boolean()]).optional(),
  })
),
}).passthrough();

export type NpmPackageData = z.infer<typeof NpmPackageSchema>;

// ── Registry client ───────────────────────────────────────────────────────────
export class RegistryClient {
  private client: AxiosInstance;
  private cacheDir: string | null;

  constructor(cacheDir: string | null = null) {
    this.cacheDir = cacheDir;
    this.client = axios.create({
      baseURL: 'https://registry.npmjs.org',
      timeout: 10_000,
      headers: { Accept: 'application/json' },
    });

    if (cacheDir) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }
  }

  private cacheKey(packageName: string): string {
    const hash = crypto.createHash('md5').update(packageName).digest('hex');
    return path.join(this.cacheDir!, `${hash}.json`);
  }

  private readCache(packageName: string): NpmPackageData | null {
    if (!this.cacheDir) return null;
    const file = this.cacheKey(packageName);
    if (!fs.existsSync(file)) return null;

    try {
      const stat = fs.statSync(file);
      const ageMs = Date.now() - stat.mtimeMs;
      // Cache TTL: 1 jam
      if (ageMs > 60 * 60 * 1000) return null;

      const raw = fs.readFileSync(file, 'utf-8');
      return JSON.parse(raw) as NpmPackageData;
    } catch {
      return null;
    }
  }

  private writeCache(packageName: string, data: NpmPackageData): void {
    if (!this.cacheDir) return;
    const file = this.cacheKey(packageName);
    fs.writeFileSync(file, JSON.stringify(data), 'utf-8');
  }

  async fetchPackage(packageName: string): Promise<NpmPackageData> {
    const cached = this.readCache(packageName);
    if (cached) return cached;

    const encoded = encodeURIComponent(packageName).replace('%40', '@');
    const response = await this.client.get<unknown>(`/${encoded}`);

    const parsed = NpmPackageSchema.parse(response.data);
    this.writeCache(packageName, parsed);
    return parsed;
  }
}

// ── Concurrency limiter ───────────────────────────────────────────────────────
export async function pLimit<T>(
  tasks: (() => Promise<T>)[],
  concurrency: number
): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const i = index++;
      results[i] = await tasks[i]();
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);
  return results;
}