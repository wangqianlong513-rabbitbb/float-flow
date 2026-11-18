export interface UiPalette {
  name?: string;
  subtitle?: string;
  bg: string;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  auroraColor: string;
  cloudColor: string;
  glowAura: string;
  panel: string;
  panelSoft: string;
  panelBorder: string;
  cyan: string;
  glacier: string;
  blue: string;
  violet: string;
  gold: string;
  pink: string;
  success: string;
  ctaGlow: string;
  text: string;
  muted: string;
  moonColor?: string;
  moonGlow?: string;
  waterfallColor?: string;
  foliageColor?: string;
  crystalPrimary?: string;
  crystalSecondary?: string;
  cloudWhite?: string;
  cloudMist?: string;
  plateauSnow?: string;
  plateauIce?: string;
}

const ICEFIELD: UiPalette = {
  name: '极光浮岛',
  subtitle: '琉璃星夜 · 灵光微澜',
  bg: '#0E1A36',
  skyTop: '#0D1129',
  skyMid: '#142750',
  skyBottom: '#14466F',
  auroraColor: '#22DCF2',
  cloudColor: '#FFFFFF',
  cloudWhite: '#FFFFFF',
  cloudMist: '#E0F2FE',
  glowAura: '#38BDF8',
  panel: '#152548',
  panelSoft: '#1F3868',
  panelBorder: '#38BDF8',
  cyan: '#00F0FF',
  glacier: '#E0F2FE',
  blue: '#3B82F6',
  violet: '#A78BFA',
  gold: '#FDE047',
  pink: '#F472B6',
  success: '#34D399',
  ctaGlow: '#00F0FF',
  text: '#FFFFFF',
  muted: '#94A3B8',
  moonColor: '#FFFBEB',
  moonGlow: '#67E8F9',
  waterfallColor: '#38BDF8',
  foliageColor: '#10B981',
  crystalPrimary: '#22D3EE',
  crystalSecondary: '#A78BFA',
  plateauSnow: '#F8FAFC',
  plateauIce: '#BAE6FD',
};

const MIST: UiPalette = {
  name: '暮色霞光',
  subtitle: '晚霞拂晓 · 幻彩星港',
  bg: '#1A0D2A',
  skyTop: '#1E0B2E',
  skyMid: '#3F174B',
  skyBottom: '#6B2556',
  auroraColor: '#F472B6',
  cloudColor: '#FFF1F2',
  cloudWhite: '#FFF5F5',
  cloudMist: '#FCE7F3',
  glowAura: '#F472B6',
  panel: '#28173E',
  panelSoft: '#3C205C',
  panelBorder: '#F472B6',
  cyan: '#38BDF8',
  glacier: '#FCE7F3',
  blue: '#818CF8',
  violet: '#E879F9',
  gold: '#FBBF24',
  pink: '#FB7185',
  success: '#34D399',
  ctaGlow: '#E879F9',
  text: '#FFF5F8',
  muted: '#C4B5CD',
  moonColor: '#FEF08A',
  moonGlow: '#F472B6',
  waterfallColor: '#E879F9',
  foliageColor: '#8B5CF6',
  crystalPrimary: '#E879F9',
  crystalSecondary: '#38BDF8',
  plateauSnow: '#FDF2F8',
  plateauIce: '#FBCFE8',
};

const DAWN: UiPalette = {
  name: '晨曦碧空',
  subtitle: '纯澈苍穹 · 日冕金辉',
  bg: '#0A2238',
  skyTop: '#0D2D49',
  skyMid: '#124864',
  skyBottom: '#176B7C',
  auroraColor: '#2DD4BF',
  cloudColor: '#FEFCE8',
  cloudWhite: '#FFFFFF',
  cloudMist: '#CCFBF1',
  glowAura: '#F59E0B',
  panel: '#153550',
  panelSoft: '#1E4B72',
  panelBorder: '#2DD4BF',
  cyan: '#2DD4BF',
  glacier: '#CCFBF1',
  blue: '#0EA5E9',
  violet: '#FB923C',
  gold: '#F59E0B',
  pink: '#FB7185',
  success: '#10B981',
  ctaGlow: '#F59E0B',
  text: '#F0FDFA',
  muted: '#99B5C8',
  moonColor: '#FFFBEB',
  moonGlow: '#FDE047',
  waterfallColor: '#2DD4BF',
  foliageColor: '#059669',
  crystalPrimary: '#F59E0B',
  crystalSecondary: '#2DD4BF',
  plateauSnow: '#F0FDF4',
  plateauIce: '#A7F3D0',
};

export function getUiPalette(themeIndex: number): UiPalette {
  if (themeIndex === 1) return MIST;
  if (themeIndex === 2) return DAWN;
  return ICEFIELD;
}
