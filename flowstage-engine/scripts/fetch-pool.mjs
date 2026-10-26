#!/usr/bin/env node
/**
 * Fetch b-roll for one or all content pools.
 *
 *   node scripts/fetch-pool.mjs dance
 *   node scripts/fetch-pool.mjs --all
 *   node scripts/fetch-pool.mjs --list
 *
 * Sources (all free for commercial use, no attribution required):
 *   - Pexels   (set PEXELS_API_KEY)   https://www.pexels.com/api/
 *   - Pixabay  (set PIXABAY_API_KEY)  https://pixabay.com/api/docs/
 *
 * Clips land in public/pools/<pool>/ and a manifest.json is written per pool.
 * Anything you place in public/pools/<pool>/my-clips/ (your own footage or
 * clips you have licensed) is picked up by the manifest automatically.
 */
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const POOLS_FILE = path.join(ROOT, 'src/data/pools.json');
const OUT_ROOT = path.join(ROOT, 'public/pools');

const PEXELS_KEY = process.env.PEXELS_API_KEY;
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

const {pools} = JSON.parse(fs.readFileSync(POOLS_FILE, 'utf8'));
const args = process.argv.slice(2);

if (args.includes('--list') || args.length === 0) {
  console.log('Available pools:\n');
  for (const [name, p] of Object.entries(pools)) {
    console.log(`  ${name.padEnd(12)} ${p.label}  (${p.queries.length} queries)`);
  }
  console.log('\nUsage: node scripts/fetch-pool.mjs <pool> | --all');
  process.exit(0);
}

const targets = args.includes('--all') ? Object.keys(pools) : args.filter((a) => pools[a]);
if (targets.length === 0) {
  console.error(`Unknown pool. Run with --list to see options.`);
  process.exit(1);
}
if (!PEXELS_KEY && !PIXABAY_KEY) {
  console.error('Set PEXELS_API_KEY and/or PIXABAY_API_KEY first (both free).');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchPexels(query, perPage) {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&orientation=portrait&size=medium&per_page=${perPage}`;
  const res = await fetch(url, {headers: {Authorization: PEXELS_KEY}});
  if (!res.ok) throw new Error(`Pexels ${res.status} for "${query}"`);
  const data = await res.json();
  return (data.videos ?? []).map((v) => {
    // pick the smallest file that is still >= 720p tall, portrait
    const files = v.video_files
      .filter((f) => f.height > f.width && f.height >= 720)
      .sort((a, b) => a.height - b.height);
    const file = files[0] ?? v.video_files[0];
    return file && {id: `pexels-${v.id}`, url: file.link, duration: v.duration, source: 'pexels'};
  }).filter(Boolean);
}

async function searchPixabay(query, perPage) {
  const url = `https://pixabay.com/api/videos/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=${perPage}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Pixabay ${res.status} for "${query}"`);
  const data = await res.json();
  return (data.hits ?? [])
    .map((v) => {
      const f = v.videos?.medium ?? v.videos?.small;
      // Pixabay is mostly landscape; keep portrait or square-ish only
      if (!f || f.width > f.height * 1.1) return null;
      return {id: `pixabay-${v.id}`, url: f.url, duration: v.duration, source: 'pixabay'};
    })
    .filter(Boolean);
}

async function download(url, dest) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
}

function buildManifest(poolName, dir) {
  const entries = [];
  const walk = (d, rel) => {
    for (const f of fs.readdirSync(d)) {
      const full = path.join(d, f);
      if (fs.statSync(full).isDirectory()) walk(full, path.posix.join(rel, f));
      else if (/\.(mp4|mov|webm)$/i.test(f)) entries.push(path.posix.join(rel, f));
    }
  };
  walk(dir, `pools/${poolName}`);
  const manifest = {pool: poolName, updated: new Date().toISOString(), clips: entries.sort()};
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  return entries.length;
}

for (const poolName of targets) {
  const pool = pools[poolName];
  const dir = path.join(OUT_ROOT, poolName);
  fs.mkdirSync(path.join(dir, 'my-clips'), {recursive: true});
  console.log(`\n▶ Pool "${poolName}" — ${pool.label}`);

  const seen = new Set(
    fs.readdirSync(dir).filter((f) => f.endsWith('.mp4')).map((f) => f.replace('.mp4', ''))
  );

  for (const query of pool.queries) {
    const per = pool.perQuery ?? 5;
    let results = [];
    try {
      if (PEXELS_KEY) results = results.concat(await searchPexels(query, per));
      if (PIXABAY_KEY) results = results.concat(await searchPixabay(query, Math.ceil(per / 2)));
    } catch (err) {
      console.warn(`  ⚠ ${err.message}`);
      continue;
    }
    let got = 0;
    for (const clip of results) {
      if (seen.has(clip.id)) continue;
      if (clip.duration && (clip.duration < 4 || clip.duration > 60)) continue;
      const dest = path.join(dir, `${clip.id}.mp4`);
      try {
        process.stdout.write(`  ↓ ${clip.id} (${query}) ... `);
        await download(clip.url, dest);
        console.log('ok');
        seen.add(clip.id);
        got++;
      } catch (err) {
        console.log(`failed (${err.message})`);
        fs.rmSync(dest, {force: true});
      }
      await sleep(300); // be polite to the APIs
    }
    if (got === 0) console.log(`  · nothing new for "${query}"`);
  }

  const total = buildManifest(poolName, dir);
  console.log(`✔ ${poolName}: ${total} clips in manifest (incl. my-clips/)`);
}

console.log('\nDone. Manifests written — the Studio picks them up automatically.');
