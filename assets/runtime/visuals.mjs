export const VISUALS_KEY = 'pdcf-visuals-v1';
export const MOTION_MODES = ['system', 'reduced', 'full'];

export function visualSettings(value) {
  return {
    motion: MOTION_MODES.includes(value?.motion) ? value.motion : 'system',
    shake: typeof value?.shake === 'boolean' ? value.shake : true,
    film: typeof value?.film === 'boolean' ? value.film : true,
    backgrounds: typeof value?.backgrounds === 'boolean' ? value.backgrounds : true
  };
}

export function visualEffects(value, systemReduced = false) {
  const settings = visualSettings(value);
  const reducedMotion = settings.motion === 'reduced' || (settings.motion === 'system' && systemReduced);
  return { reducedMotion, shake: !reducedMotion && settings.shake, film: !reducedMotion && settings.film, backgrounds: !reducedMotion && settings.backgrounds };
}
