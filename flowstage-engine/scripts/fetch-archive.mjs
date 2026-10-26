#!/usr/bin/env node
/**
 * Pull public-domain retro/weird footage from the Internet Archive into a pool.
 * Great for meme energy: 60s dance parties, bizarre instructional films,
 * vintage commercials. No API key needed.
 *
 *   node scripts/fetch-archive.mjs            # pools that define an `archive` block (e.g. meme)
 *   node scripts/fetch-archive.mjs meme
 */
import fs from 'node:fs';
import path from 'node:path';
import {pipeline} from 'node:stream/promises';
import {Readable} from 'node:stream';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const {pools} = JSON.parse(fs.readFileSync(path.join(ROOT, 'src/data/pools.json'), 'utf8'));
const OUT_ROOT = path.join(ROOT, 'public/pools');

const args = process.argv.slice(2);
const targets = Object.entries(pools).filter(
  ([name, p]) => p.archive && (args.length === 0 || args.includes(name))
);
if (targets.length === 0) {
  console.log('No pools with an `archive` block matched. Add one in src/data/pools.json.');
  process.exit(0);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function searchArchive(query, collections, rows) {
  const collectionQ = collections.map((c) => `collection:(${c})`).join(' OR ');
  const q = encodeURIComponent(`(${collectionQ}) AND mediatype:(movies) AND ${query}`);
  const url = `https://archive.org/advancedsearch.php?q=${q}&fl[]=identifier&fl[]=downloads&sort[]=downloads+desc&rows=${rows}&output=json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`archive search ${res.status}`);
  const data = await res.json();
  return (data.response?.docs ?? []).map((d) => d.identifier);
}

async function bestMp4(identifier) {
  const res = await fetch(`https://archive.org/metadata/${identifier}`);
  if (!res.ok) return null;
  const meta = await res.json();
  const mp4s = (meta.files ?? [])
    .filter((f) => /\.mp4$/i.test(f.name) && Number(f.size) < 200 * 1024 * 1024)
    .sort((a, b) => Number(a.size) - Number(b.size));
  const file = mp4s[0];
  return file ? `https://archive.org/download/${identifier}/${encodeURIComponent(file.name)}` : null;
}

for (const [poolName, pool] of targets) {
  const {collections, queries, perQuery = 3} = pool.archive;
  const dir = path.join(OUT_ROOT, poolName);
  fs.mkdirSync(dir, {recursive: true});
  console.log(`\n▶ Archive footage → pool "${poolName}"`);

  for (const query of queries) {
    let ids = [];
    try {
      ids = await searchArchive(query, collections, perQuery);
    } catch (err) {
      console.warn(`  ⚠ ${err.message}`);
      continue;
    }
    for (const id of ids) {
      const dest = path.join(dir, `archive-${id}.mp4`);
      if (fs.existsSync(dest)) continue;
      const url = await bestMp4(id);
      if (!url) continue;
      try {
        process.stdout.write(`  ↓ ${id} ... `);
        const res = await fetch(url);
        if (!res.ok) throw new Error(res.status);
        await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(dest));
        console.log('ok');
      } catch (err) {
        console.log(`failed (${err.message})`);
        fs.rmSync(dest, {force: true});
      }
      await sleep(500);
    }
  }
  // rebuild manifest so the Studio sees new clips immediately
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
  console.log(`✔ ${poolName}: manifest updated (${entries.length} clips)`);
}
