// Runs every test suite in tests/ and fails if any of them fails. Used by `npm test`.
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const dir = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', 'tests');
const suites = fs.readdirSync(dir).filter(f => f.endsWith('.test.mjs')).sort();
let failed = 0;
for (const f of suites) {
  const r = spawnSync(process.execPath, [path.join(dir, f)], {encoding: 'utf8'});
  const ok = r.status === 0;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${f}`);
  if (!ok) process.stdout.write((r.stdout || '') + (r.stderr || ''));
}
console.log(`\n${suites.length - failed}/${suites.length} suites passed`);
process.exit(failed ? 1 : 0);
