# flowstage-engine v2 — content pools edition

Batch lyric videos for Taste Gusto, now with **content pools**: swappable libraries of TikTok-style footage (people dancing, relatable moments, meme energy, nightlife, moody aesthetic) so the same chorus can ship as five completely different videos.

## What changed from v1

The single b-roll folder is gone. Every video in your calendar now names a **pool**, and each pool is a folder of clips with its own vibe:

| Pool | Vibe | Sources |
|---|---|---|
| `dance` | people dancing — street, afro, club, hip-hop | Pexels/Pixabay |
| `relatable` | candid everyday moments — laughing, commuting, late nights | Pexels/Pixabay |
| `meme` | chaotic/funny — reactions, pets, weird retro footage | Pexels/Pixabay + Internet Archive |
| `party` | nightlife, crowds, neon | Pexels/Pixabay |
| `aesthetic` | moody b-roll — rain, smoke, silhouettes | Pexels/Pixabay |

Add or edit pools in `src/data/pools.json` — a pool is just a label plus search queries.

There's also a new **`meme_bar` aesthetic**: classic TikTok meme framing with a white caption bar on top (`memeCaption` in the calendar) and lyrics small at the bottom. Pair it with the `meme` pool.

### Why no TikTok downloader

Pulling other creators' videos gets accounts muted/struck by rights-matching, so the engine sources footage you can actually post: Pexels and Pixabay clips are free for commercial use with no attribution, and Internet Archive collections (Prelinger, vintage commercials) are public domain. For real TikTok-native energy, the strongest move is still your own footage — see *my-clips* below.

## Setup (Codespaces, no local install)

1. Push this folder to a GitHub repo → **Code → Create codespace**. The devcontainer installs everything.
2. Add secrets in the Codespace terminal or repo settings: `PEXELS_API_KEY`, `PIXABAY_API_KEY` (both free), `OPENAI_API_KEY` (for transcription).
3. Drop your song at `public/audio/song.mp3`.

## Workflow

```bash
# 1. Transcribe once per song (then hand-fix any misheard words)
OPENAI_API_KEY=sk-... npm run transcribe -- public/audio/song.mp3 src/data/song.words.json

# 2. Fill your pools — either or both:
npm run fetch -- --all          # stock: Pexels/Pixabay (or: npm run fetch -- dance meme)
npm run fetch:archive           # retro/weird public-domain footage into the meme pool
#    ...and/or drop your own clips into public/pools/<pool>/my-clips/, then:
npm run manifest                # index whatever is on disk — no API keys needed

# 3. Preview in the browser
npm run studio                  # tweak pool/aesthetic/seed live in the props panel

# 4. Batch render the week
cp src/data/calendar.example.json src/data/calendar.json   # edit sections/pools/hooks
npm run batch -- src/data/calendar.json                    # → out/*.mp4
npm run batch -- src/data/calendar.json --only wed-chorus-meme
```

## Getting "a bunch of different pieces of content" fast

Three dials, all in the calendar, none require re-editing anything:

- **`pool`** — same song section, totally different footage vibe.
- **`aesthetic`** — `taste_gusto`, `meme_bar`, `afro_heat`, `dancehall_neon`, `rnb_mood`, `hiphop_punch`.
- **`seed`** — any string; bump it (`"1"` → `"2"`) and the b-roll reshuffles into a new non-repeating order. Same section × 3 seeds = 3 distinct videos in one render run.

## my-clips: your own footage

Every pool has a `public/pools/<pool>/my-clips/` folder. Anything you drop there (your dance takes, Sony b-roll, licensed creator packs) is included in the manifest automatically and **weighted to appear earlier** in the rotation than stock. This is your unfair advantage — stock fills volume, your footage carries the brand.

## Beat-snapped cuts (optional)

```bash
pip install librosa soundfile
npm run analyze -- public/audio/song.mp3 src/data/song.beats.json
```

## Project map

```
scripts/fetch-pool.mjs      Pexels + Pixabay → public/pools/<name>/ + manifest.json
scripts/fetch-archive.mjs   Internet Archive → meme pool (public domain)
scripts/build-manifest.mjs  index dropped clips, no API keys needed
scripts/transcribe.mjs      Whisper word-level sync
scripts/batch-render.mjs    calendar → out/*.mp4
src/data/pools.json         pool definitions (edit queries here)
src/data/calendar.example.json  a full example week
src/presets/aesthetics.ts   visual styles incl. meme_bar
src/LyricVideo.tsx          the composition (captions, tint, ring, beat punch, meme bar)
src/lib/rotation.ts         seeded non-repeating clip rotation (my-clips boosted)
```

## Roadmap

1. Caption editor UI (fix transcript words in-browser)
2. Hook generator from lyrics
3. Calendar UI + TikTok inbox push (`video.upload`, no auto-post — auto-posting gets shadowbanned)
4. In-app pool browser (preview clips, kick weak ones out of the manifest)
