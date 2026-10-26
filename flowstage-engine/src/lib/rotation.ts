/**
 * Deterministic, seeded, non-repeating clip rotation.
 * Same seed → same video every render; different seeds → different clip order.
 * Guarantees no clip appears twice in a row, and clips from my-clips/
 * (your own footage) are boosted to appear earlier in the rotation.
 */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function rotateClips(clips: string[], seed: string, count: number): string[] {
  if (clips.length === 0) return [];
  const rand = mulberry32(hashSeed(seed));

  // shuffle, with my-clips weighted toward the front
  const scored = clips.map((c) => ({
    c,
    score: rand() - (c.includes('/my-clips/') ? 0.35 : 0),
  }));
  scored.sort((a, b) => a.score - b.score);
  const order = scored.map((s) => s.c);

  // cycle through the shuffled order, fixing adjacent duplicates
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    let next = order[i % order.length];
    if (out.length > 0 && next === out[out.length - 1] && order.length > 1) {
      next = order[(i + 1) % order.length];
    }
    out.push(next);
  }
  return out;
}
