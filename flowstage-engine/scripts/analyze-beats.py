#!/usr/bin/env python3
"""Optional: detect beats so clip cuts land exactly on them.
    pip install librosa soundfile
    python3 scripts/analyze-beats.py public/audio/song.mp3 src/data/song.beats.json
"""
import json, sys

def main():
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(1)
    import librosa
    audio, out = sys.argv[1], sys.argv[2]
    y, sr = librosa.load(audio)
    tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
    times = librosa.frames_to_time(frames, sr=sr)
    with open(out, "w") as f:
        json.dump({"bpm": float(tempo), "beats": [round(float(t), 3) for t in times]}, f, indent=2)
    print(f"✔ {len(times)} beats @ ~{float(tempo):.1f} BPM → {out}")

if __name__ == "__main__":
    main()
