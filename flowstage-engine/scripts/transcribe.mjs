#!/usr/bin/env node
/**
 * Word-level lyric sync via OpenAI Whisper API.
 *
 *   OPENAI_API_KEY=sk-... node scripts/transcribe.mjs public/audio/song.mp3 src/data/song.words.json
 *
 * Output: [{ "word": "think", "start": 12.34, "end": 12.61 }, ...]
 * Edit the JSON by hand for any words Whisper misses — the same file then
 * drives every video you batch from that song.
 */
import fs from 'node:fs';
import path from 'node:path';

const [, , audioPath, outPath] = process.argv;
if (!audioPath || !outPath) {
  console.error('Usage: node scripts/transcribe.mjs <audio file> <output json>');
  process.exit(1);
}
const key = process.env.OPENAI_API_KEY;
if (!key) {
  console.error('Set OPENAI_API_KEY first.');
  process.exit(1);
}

const form = new FormData();
form.append('file', new Blob([fs.readFileSync(audioPath)]), path.basename(audioPath));
form.append('model', 'whisper-1');
form.append('response_format', 'verbose_json');
form.append('timestamp_granularities[]', 'word');

const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  method: 'POST',
  headers: {Authorization: `Bearer ${key}`},
  body: form,
});
if (!res.ok) {
  console.error(`Whisper API error ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const data = await res.json();
const words = (data.words ?? []).map((w) => ({
  word: w.word.trim(),
  start: w.start,
  end: w.end,
}));
fs.mkdirSync(path.dirname(outPath), {recursive: true});
fs.writeFileSync(outPath, JSON.stringify(words, null, 2));
console.log(`✔ ${words.length} words → ${outPath}`);
console.log('Open it and fix anything Whisper misheard — timings are in seconds.');
