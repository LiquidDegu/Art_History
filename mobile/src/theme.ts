// Visual tokens, carried over from the reference prototype
// (docs/art-history-app-prototype.jsx TOKENS/ERAS) so the production app
// keeps the same "museum at dusk" feel it was designed around.
import type { EraId } from './types/content';

export const COLORS = {
  wall: '#24322A',
  wallDeep: '#1A241E',
  gold: '#C9A227',
  goldLight: '#E4C766',
  cream: '#F7F4EC',
  ink: '#1E1B16',
  burgundy: '#7A2E3A',
  card: '#FFFFFF',
  fade: '#EFEAE0',
  success: '#3F7A56',
  successBg: '#EAF5EE',
  successText: '#245036',
  errorBg: '#FBEBEE',
};

export const ERA_COLORS: Record<EraId, [string, string]> = {
  ancient: ['#B8935A', '#8C6A3B'],
  medieval: ['#6E5A8C', '#453760'],
  renaissance: ['#C9A227', '#8C6E1A'],
  baroque: ['#7A2E3A', '#4E1D25'],
  impressionism: ['#4C8C7A', '#2E5A4C'],
  modern: ['#3B4A9C', '#242F63'],
};
