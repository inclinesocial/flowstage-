import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {useAudioData, visualizeAudio} from '@remotion/media-utils';
import {loadFont as loadAnton} from '@remotion/google-fonts/Anton';
import {loadFont as loadArchivo} from '@remotion/google-fonts/ArchivoBlack';
import {loadFont as loadBebas} from '@remotion/google-fonts/BebasNeue';
import {AESTHETICS} from './presets/aesthetics';
import {rotateClips} from './lib/rotation';

const anton = loadAnton();
const archivo = loadArchivo();
const bebas = loadBebas();
const FONT_FAMILY: Record<string, string> = {
  Anton: anton.fontFamily,
  'Archivo Black': archivo.fontFamily,
  'Bebas Neue': bebas.fontFamily,
};

export interface Word {
  word: string;
  start: number; // seconds, relative to full song
  end: number;
}

export interface LyricVideoProps {
  audio: string;          // file under public/audio/
  words: Word[];          // full-song word timings (from transcribe.mjs)
  startSec: number;       // song section start
  clips: string[];        // resolved by calculateMetadata from the pool manifest
  pool: string;           // pool name, used for manifest lookup + seed
  aesthetic: string;      // key of AESTHETICS
  hook: string;           // hook chip text ('' to hide)
  memeCaption: string;    // top-bar text when captionMode === 'meme'
  seed: string;           // rotation seed — change to reshuffle b-roll
  clipSeconds: number;    // seconds per b-roll cut
  durationSec: number;    // video length (read by calculateMetadata)
  [key: string]: unknown; // Remotion requires an index signature on props
}

export const LyricVideo: React.FC<LyricVideoProps> = ({
  audio,
  words,
  startSec,
  clips,
  pool,
  aesthetic,
  hook,
  memeCaption,
  seed,
  clipSeconds,
}) => {
  const frame = useCurrentFrame();
  const {fps, durationInFrames, width, height} = useVideoConfig();
  const style = AESTHETICS[aesthetic] ?? AESTHETICS.taste_gusto;
  const font = FONT_FAMILY[style.font];

  const audioSrc = staticFile(`audio/${audio}`);
  const audioData = useAudioData(audioSrc);

  // beat punch from live amplitude
  let punch = 0;
  if (audioData && style.beatZoom > 0) {
    const vis = visualizeAudio({
      fps,
      frame: frame + Math.round(startSec * fps),
      audioData,
      numberOfSamples: 16,
    });
    const bass = (vis[0] + vis[1] + vis[2]) / 3;
    punch = Math.min(1, bass * 2) * style.beatZoom;
  }

  // b-roll sequence
  const clipFrames = Math.max(1, Math.round(clipSeconds * fps));
  const cuts = Math.ceil(durationInFrames / clipFrames);
  const order = rotateClips(clips, `${seed}-${pool}`, cuts);

  // words inside this section, re-based to local time
  const endSec = startSec + durationInFrames / fps;
  const local = words
    .filter((w) => w.end > startSec && w.start < endSec)
    .map((w) => ({...w, start: w.start - startSec, end: w.end - startSec}));

  const t = frame / fps;
  const activeIdx = local.findIndex((w) => t >= w.start && t < w.end);
  // sliding window of 4 words centered on the active one
  const windowStart = Math.max(0, (activeIdx === -1 ? local.findIndex((w) => w.start > t) : activeIdx) - 1);
  const line = local.slice(windowStart, windowStart + 4);

  const isMeme = style.captionMode === 'meme';
  const barH = Math.round(height * 0.16);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {/* b-roll cuts */}
      {order.map((clip, i) => (
        <Sequence key={i} from={i * clipFrames} durationInFrames={clipFrames}>
          <AbsoluteFill style={{top: isMeme ? barH : 0}}>
            <OffthreadVideo
              src={staticFile(clip)}
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                filter: style.grade,
                transform: `scale(${1.05 + punch + interpolate(
                  frame - i * clipFrames,
                  [0, clipFrames],
                  [0, 0.04]
                )})`,
              }}
            />
          </AbsoluteFill>
        </Sequence>
      ))}

      {/* duotone tint */}
      {style.tintOpacity > 0 && (
        <AbsoluteFill
          style={{
            top: isMeme ? barH : 0,
            backgroundColor: style.tint,
            opacity: style.tintOpacity,
            mixBlendMode: 'color',
          }}
        />
      )}

      {/* surreal ring motif */}
      {style.ring && (
        <AbsoluteFill style={{justifyContent: 'center', alignItems: 'center'}}>
          <div
            style={{
              width: width * 0.72,
              height: width * 0.72,
              borderRadius: '50%',
              border: `3px solid ${style.textColor}`,
              opacity: 0.35,
              transform: `scale(${1 + punch * 2}) rotate(${frame * 0.15}deg)`,
            }}
          />
        </AbsoluteFill>
      )}

      {/* meme top bar */}
      {isMeme && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: barH,
            backgroundColor: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 48px',
          }}
        >
          <span
            style={{
              fontFamily: font,
              color: style.textColor,
              fontSize: 52,
              lineHeight: 1.15,
              textAlign: 'center',
            }}
          >
            {memeCaption}
          </span>
        </div>
      )}

      {/* lyric captions */}
      <AbsoluteFill
        style={{
          justifyContent: isMeme ? 'flex-end' : 'center',
          alignItems: 'center',
          paddingBottom: isMeme ? height * 0.14 : 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'center',
            gap: '0 22px',
            maxWidth: '86%',
            transform: `scale(${1 + punch * 1.6})`,
          }}
        >
          {line.map((w, i) => {
            const active = t >= w.start && t < w.end;
            return (
              <span
                key={`${windowStart + i}-${w.start}`}
                style={{
                  fontFamily: font,
                  textTransform: 'uppercase',
                  fontSize: isMeme ? 64 : 96,
                  lineHeight: 1.05,
                  color: active ? style.activeColor : style.textColor,
                  opacity: active ? 1 : 0.85,
                  textShadow: '0 4px 24px rgba(0,0,0,0.65)',
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                }}
              >
                {w.word}
              </span>
            );
          })}
        </div>
      </AbsoluteFill>

      {/* hook chip */}
      {hook && !isMeme && (
        <AbsoluteFill style={{alignItems: 'center', justifyContent: 'flex-start', paddingTop: height * 0.12}}>
          <div
            style={{
              fontFamily: font,
              backgroundColor: style.activeColor,
              color: '#101010',
              padding: '14px 30px',
              fontSize: 44,
              textTransform: 'uppercase',
              borderRadius: 8,
              maxWidth: '82%',
              textAlign: 'center',
            }}
          >
            {hook}
          </div>
        </AbsoluteFill>
      )}

      <Audio src={audioSrc} startFrom={Math.round(startSec * fps)} />
    </AbsoluteFill>
  );
};
