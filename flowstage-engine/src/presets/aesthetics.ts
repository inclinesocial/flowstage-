/**
 * Aesthetic presets. `taste_gusto` is the house style:
 * bone-white condensed caps, acid-green active word, near-duotone grade.
 *
 * `captionMode`:
 *   "lyric"  — big centered karaoke-style words (music-first)
 *   "meme"   — white bar top with black text + lyrics small at bottom
 *              (classic TikTok meme framing; pairs with the meme pool)
 */
export type CaptionMode = 'lyric' | 'meme';

export interface Aesthetic {
  id: string;
  label: string;
  font: 'Anton' | 'Archivo Black' | 'Bebas Neue';
  textColor: string;
  activeColor: string;
  tint: string;          // duotone tint overlay color
  tintOpacity: number;   // 0–1
  grade: string;         // CSS filter applied to b-roll
  captionMode: CaptionMode;
  beatZoom: number;      // extra scale punch on beats (0 = off)
  ring: boolean;         // surreal ring motif
}

export const AESTHETICS: Record<string, Aesthetic> = {
  taste_gusto: {
    id: 'taste_gusto',
    label: 'Taste Gusto — surreal bold',
    font: 'Anton',
    textColor: '#F4F2EA',
    activeColor: '#B7FF2E',
    tint: '#20242B',
    tintOpacity: 0.35,
    grade: 'grayscale(0.85) contrast(1.25) brightness(0.95)',
    captionMode: 'lyric',
    beatZoom: 0.045,
    ring: true,
  },
  meme_bar: {
    id: 'meme_bar',
    label: 'Meme bar — white top caption',
    font: 'Archivo Black',
    textColor: '#111111',
    activeColor: '#B7FF2E',
    tint: '#000000',
    tintOpacity: 0,
    grade: 'contrast(1.05) saturate(1.15)',
    captionMode: 'meme',
    beatZoom: 0.03,
    ring: false,
  },
  afro_heat: {
    id: 'afro_heat',
    label: 'Afro Heat',
    font: 'Bebas Neue',
    textColor: '#FFF3D6',
    activeColor: '#FF7A00',
    tint: '#3B1D00',
    tintOpacity: 0.3,
    grade: 'saturate(1.4) contrast(1.15) sepia(0.15)',
    captionMode: 'lyric',
    beatZoom: 0.05,
    ring: false,
  },
  dancehall_neon: {
    id: 'dancehall_neon',
    label: 'Dancehall Neon',
    font: 'Anton',
    textColor: '#EAFBFF',
    activeColor: '#00F0FF',
    tint: '#12003A',
    tintOpacity: 0.4,
    grade: 'saturate(1.5) contrast(1.2) hue-rotate(-10deg)',
    captionMode: 'lyric',
    beatZoom: 0.06,
    ring: false,
  },
  rnb_mood: {
    id: 'rnb_mood',
    label: 'R&B Mood',
    font: 'Bebas Neue',
    textColor: '#F2E6FF',
    activeColor: '#C084FC',
    tint: '#1A0B2E',
    tintOpacity: 0.45,
    grade: 'grayscale(0.4) contrast(1.1) brightness(0.9)',
    captionMode: 'lyric',
    beatZoom: 0.02,
    ring: true,
  },
  hiphop_punch: {
    id: 'hiphop_punch',
    label: 'Hip-Hop Punch',
    font: 'Archivo Black',
    textColor: '#FFFFFF',
    activeColor: '#FF2E2E',
    tint: '#000000',
    tintOpacity: 0.3,
    grade: 'grayscale(1) contrast(1.4)',
    captionMode: 'lyric',
    beatZoom: 0.07,
    ring: false,
  },
};
