export const CONTROLS_KEY = 'pdcf-controls-v1';
export const ACTIONS = { left: 'Move left', right: 'Move right', jump: 'Jump', guard: 'Guard', punch: 'Punch', kick: 'Kick', special: 'Special', throw: 'Throw', dash: 'Dash', reset: 'Reset Training' };
export const PAD_DEFAULTS = { jump: 0, guard: 4, punch: 2, kick: 3, special: 1, throw: 5, dash: 7, reset: 8 };
const KEYS = [
  { left: 'KeyA', right: 'KeyD', jump: 'KeyW', guard: 'KeyS', punch: 'KeyF', kick: 'KeyG', special: 'KeyH', throw: 'KeyR', dash: 'ShiftLeft', reset: 'Backspace' },
  { left: 'ArrowLeft', right: 'ArrowRight', jump: 'ArrowUp', guard: 'ArrowDown', punch: 'KeyJ', kick: 'KeyK', special: 'KeyL', throw: 'KeyI', dash: 'ShiftRight', reset: 'Delete' }
];
export const validKey = key => typeof key === 'string' && /^(Key[A-Z]|Digit[0-9]|Numpad[0-9]|Arrow(Left|Right|Up|Down)|Space|Enter|Shift(Left|Right)|Backspace|Delete|Comma|Period|Slash|Semicolon|Quote|Bracket(Left|Right)|Backquote|Minus|Equal)$/.test(key);
export const validButton = button => Number.isInteger(button) && button >= 0 && button <= 11 && button !== 9;

export function controlSettings(value) {
  const saved = value?.version === 1 && Array.isArray(value.players) && value.players.length === 2 ? value.players : [];
  const map = (candidate, defaults, valid) => {
    const keys = Object.keys(defaults), values = keys.map(key => candidate?.[key]);
    return keys.every(key => candidate && Object.hasOwn(candidate, key) && valid(candidate[key])) && new Set(values).size === keys.length
      ? Object.fromEntries(keys.map(key => [key, candidate[key]])) : { ...defaults };
  };
  const zone = (value, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(.1, Math.min(.8, value)) : fallback;
  const players = KEYS.map((defaults, i) => ({
    keyboard: map(saved[i]?.keyboard, defaults, validKey), buttons: map(saved[i]?.buttons, PAD_DEFAULTS, validButton),
    deadZone: zone(saved[i]?.deadZone, .3), verticalDeadZone: zone(saved[i]?.verticalDeadZone, .55)
  }));
  const keys = players.flatMap(player => Object.values(player.keyboard));
  if (new Set(keys).size !== keys.length) players.forEach((player, i) => { player.keyboard = { ...KEYS[i] }; });
  return { version: 1, players };
}

export function rebind(settings, player, device, action, value) {
  if (![0, 1].includes(player) || !['keyboard', 'buttons'].includes(device) || !Object.hasOwn(device === 'keyboard' ? KEYS[0] : PAD_DEFAULTS, action)) throw new Error('Unknown control.');
  if (!(device === 'keyboard' ? validKey(value) : validButton(value))) throw new Error(device === 'keyboard' ? 'Use a single key. Escape, Tab and system shortcuts stay reserved.' : 'Start and D-pad buttons stay reserved for menus.');
  const next = controlSettings(settings), bindings = next.players[player][device];
  if (device === 'keyboard') {
    const conflict = Object.entries(next.players[1 - player].keyboard).find(([, key]) => key === value);
    if (conflict) throw new Error(`${keyName(value)} is already P${2 - player} ${ACTIONS[conflict[0]]}. Choose another key.`);
  }
  const other = Object.keys(bindings).find(key => key !== action && bindings[key] === value);
  if (other) bindings[other] = bindings[action];
  bindings[action] = value;
  return next;
}

export function keyName(code) {
  return { ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', ShiftLeft: 'Left Shift', ShiftRight: 'Right Shift', Space: 'Space' }[code] || code.replace(/^Key|^Digit/, '').replace(/^Numpad/, 'Num ');
}
export function buttonName(index) { return ['A / ✕', 'B / ○', 'X / □', 'Y / △', 'LB / L1', 'RB / R1', 'LT / L2', 'RT / R2', 'View / Select', 'Start', 'Left stick click', 'Right stick click'][index] || `Button ${index}`; }
