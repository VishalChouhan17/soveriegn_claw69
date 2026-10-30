import { mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { tmpdir } from 'node:os';

// One atomic file per record avoids stale module caches and lost appends across workers.
export const dataDirectory = () => {
  if (process.env.SOVEREIGN_DATA_DIR) {
    return resolve(/* turbopackIgnore: true */ process.env.SOVEREIGN_DATA_DIR);
  }
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return resolve(/* turbopackIgnore: true */ join(tmpdir(), 'sovereign-data'));
  }
  return resolve(/* turbopackIgnore: true */ '.sovereign-data');
};

function directory(collection: string) {
  const dir = join(/* turbopackIgnore: true */ dataDirectory(), collection);
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  return dir;
}
export function readRecords<T>(collection: string): T[] {
  return readdirSync(/* turbopackIgnore: true */ directory(collection)).filter(n => n.endsWith('.json')).map(n =>
    JSON.parse(readFileSync(/* turbopackIgnore: true */ join(/* turbopackIgnore: true */ directory(collection), n), 'utf8')) as T);
}
export function saveRecord<T extends { id: string }>(collection: string, value: T): T {
  if (!/^[\w-]+$/.test(value.id)) throw new Error('Invalid record identifier');
  const dest = join(/* turbopackIgnore: true */ directory(collection), `${value.id}.json`);
  const temp = `${dest}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(value), { mode: 0o600 });
  renameSync(temp, dest);
  return value;
}
export function clearRecords(collection: string) {
  for (const name of readdirSync(/* turbopackIgnore: true */ directory(collection)).filter(n => n.endsWith('.json'))) unlinkSync(join(/* turbopackIgnore: true */ directory(collection), name));
}
export interface PrivacySettings {
  id: 'preferences';
  shareMemoryWithModel: boolean;
  executeSkills: boolean;
  backgroundJobs: boolean;
}
export function getSettings(): PrivacySettings {
  return readRecords<PrivacySettings>('settings')[0] || {
    id: 'preferences', shareMemoryWithModel: false, executeSkills: false, backgroundJobs: false,
  };
}

export function removeRecord(collection: string, id: string) {
  if (!/^[\w-]+$/.test(id)) throw new Error('Invalid record identifier');
  unlinkSync(join(/* turbopackIgnore: true */ directory(collection), `${id}.json`));
}
