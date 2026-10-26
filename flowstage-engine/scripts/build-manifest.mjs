#!/usr/bin/env node
/**
 * Rebuild pool manifests from whatever is on disk — no API keys needed.
 * Use this after dropping your own clips into public/pools/<pool>/my-clips/.
 *
 *   npm run manifest              # all pools that have any clips
 *   npm run manifest -- dance     # one pool
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_ROOT = path.join(ROOT, 'public/pools');
const args = process.argv.slice(2);

const poolDirs = fs.existsSync(OUT_ROOT)
  ? fs.readdirSync(OUT_ROOT).filter((d) => fs.statSync(path.join(OUT_ROOT, d)).isDirectory())
  : [];
const targets = args.length > 0 ? poolDirs.filter((d) => args.includes(d)) : poolDirs;

if (targets.length === 0) {
  console.error('No matching pool folders under public/pools/.');
  process.exit(1);
}

for (const poolName of targets) {
  const dir = path.join(OUT_ROOT, poolName);
  const entries = [];
  const walk = (d, rel) => {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full, path.posix.join(rel, f));
      else if (/\.(mp4|mov|webm)$/i.test(f)) entries.push(path.posix.join(rel, f));
    }
  };
  walk(dir, `pools/${poolName}`);
  fs.writeFileSync(
    path.join(dir, 'manifest.json'),
    JSON.stringify({pool: poolName, updated: new Date().toISOString(), clips: entries.sort()}, null, 2)
  );
  console.log(`✔ ${poolName}: ${entries.length} clip(s) in manifest`);
  if (entries.length === 0) {
    console.log(`  · drop videos into public/pools/${poolName}/my-clips/ or run: npm run fetch -- ${poolName}`);
  }
}
