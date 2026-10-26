#!/usr/bin/env node
/**
 * Render every video in a calendar file.
 *
 *   node scripts/batch-render.mjs src/data/calendar.example.json
 *   node scripts/batch-render.mjs src/data/calendar.json --only wed-chorus-meme
 *
 * Output: out/<name>.mp4
 */
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = process.argv.slice(2);
const calendarPath = args.find((a) => !a.startsWith('--')) ?? 'src/data/calendar.example.json';
const onlyIdx = args.indexOf('--only');
const only = onlyIdx !== -1 ? args[onlyIdx + 1] : null;

const calendar = JSON.parse(fs.readFileSync(path.join(ROOT, calendarPath), 'utf8'));
const words = JSON.parse(fs.readFileSync(path.join(ROOT, calendar.song.words), 'utf8'));

fs.mkdirSync(path.join(ROOT, 'out'), {recursive: true});

const videos = calendar.videos.filter((v) => !only || v.name === only);
if (videos.length === 0) {
  console.error(only ? `No video named "${only}" in calendar.` : 'Calendar has no videos.');
  process.exit(1);
}

console.log(`Rendering ${videos.length} video(s)...\n`);
const started = Date.now();

for (const v of videos) {
  // load the pool manifest so the render doesn't depend on Studio fetch
  const manifestPath = path.join(ROOT, 'public/pools', v.pool, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error(`✖ ${v.name}: pool "${v.pool}" has no manifest. Run: npm run fetch ${v.pool}`);
    continue;
  }
  const {clips} = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  if (!clips?.length) {
    console.error(`✖ ${v.name}: pool "${v.pool}" is empty.`);
    continue;
  }

  const props = {
    audio: calendar.song.audio,
    words,
    startSec: v.startSec,
    durationSec: v.durationSec,
    clips,
    pool: v.pool,
    aesthetic: v.aesthetic ?? 'taste_gusto',
    hook: v.hook ?? '',
    memeCaption: v.memeCaption ?? '',
    seed: v.seed ?? '1',
    clipSeconds: v.clipSeconds ?? 2,
  };
  const propsFile = path.join(ROOT, 'out', `.${v.name}.props.json`);
  fs.writeFileSync(propsFile, JSON.stringify(props));

  console.log(`▶ ${v.name}  [pool=${v.pool} style=${props.aesthetic} seed=${props.seed}]`);
  try {
    execFileSync(
      'npx',
      ['remotion', 'render', 'src/index.ts', 'LyricVideo', `out/${v.name}.mp4`, `--props=${propsFile}`],
      {cwd: ROOT, stdio: 'inherit'}
    );
  } catch {
    console.error(`✖ ${v.name} failed — see output above.`);
  } finally {
    fs.rmSync(propsFile, {force: true});
  }
}

console.log(`\n✔ Done in ${((Date.now() - started) / 1000 / 60).toFixed(1)} min → out/`);
