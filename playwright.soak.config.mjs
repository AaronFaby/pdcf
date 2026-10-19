import release from './playwright.config.mjs';

export default {
  ...release,
  testIgnore: [], testMatch: '**/soak.spec.mjs',
  timeout: 20 * 60 * 1000, globalTimeout: 60 * 60 * 1000,
  use: { ...release.use, trace: 'off' }
};
