/** Palettes bundled with the extension, in picker order. Validated by the background on load. */
import catppuccinMocha from '../palettes/catppuccin-mocha.json' with { type: 'json' };
import defaultDark from '../palettes/default-dark.json' with { type: 'json' };
import defaultLight from '../palettes/default-light.json' with { type: 'json' };
import nord from '../palettes/nord.json' with { type: 'json' };

export const BUNDLED_PALETTES: readonly unknown[] = [
  defaultDark,
  defaultLight,
  catppuccinMocha,
  nord,
];
