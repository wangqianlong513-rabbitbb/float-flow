export interface UiPalette {
  panel: string;
  panelSoft: string;
  cyan: string;
  blue: string;
  violet: string;
  gold: string;
  text: string;
  muted: string;
}

const ICEFIELD: UiPalette = {
  panel: '#071126',
  panelSoft: '#101B38',
  cyan: '#12E8FF',
  blue: '#2F83FF',
  violet: '#7B5CFF',
  gold: '#FFD447',
  text: '#EAF7FF',
  muted: '#9DB5CC',
};

const MIST: UiPalette = {
  panel: '#081224',
  panelSoft: '#13233F',
  cyan: '#5DE6FF',
  blue: '#4F8CFF',
  violet: '#6AA7FF',
  gold: '#FFD447',
  text: '#EAF6FF',
  muted: '#A9BFDA',
};

const DAWN: UiPalette = {
  panel: '#101726',
  panelSoft: '#1D2A3B',
  cyan: '#5DE6D6',
  blue: '#2F83FF',
  violet: '#F6A44D',
  gold: '#FFD76A',
  text: '#FFF8E8',
  muted: '#C7BFA8',
};

export function getUiPalette(themeIndex: number): UiPalette {
  if (themeIndex === 1) return MIST;
  if (themeIndex === 2) return DAWN;
  return ICEFIELD;
}
