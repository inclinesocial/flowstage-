import {Composition, staticFile, CalculateMetadataFunction} from 'remotion';
import {LyricVideo, LyricVideoProps} from './LyricVideo';

const FPS = 30;

/**
 * Resolves the b-roll pool at render/preview time:
 * fetches public/pools/<pool>/manifest.json and injects the clip list.
 * Change `pool` in props (or the batch calendar) to swap the whole vibe
 * of a video — dance / relatable / meme / party / aesthetic.
 */
const resolvePool: CalculateMetadataFunction<LyricVideoProps> = async ({props}) => {
  let clips = props.clips;
  if (!clips || clips.length === 0) {
    try {
      const res = await fetch(staticFile(`pools/${props.pool}/manifest.json`));
      const manifest = await res.json();
      clips = manifest.clips ?? [];
    } catch {
      clips = [];
    }
  }
  return {
    props: {...props, clips},
    durationInFrames: Math.round((props.durationSec || 15) * FPS),
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LyricVideo"
      component={LyricVideo}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={15 * FPS}
      calculateMetadata={resolvePool}
      defaultProps={{
        audio: 'song.mp3',
        words: [],
        startSec: 0,
        clips: [],
        pool: 'dance',
        aesthetic: 'taste_gusto',
        hook: 'POV: your 9-5 doesn’t know about your 5-9',
        memeCaption: 'when the beat drops mid-meeting',
        seed: 'a',
        clipSeconds: 2,
        durationSec: 15,
      }}
    />
  );
};
