import { ACTIONS, CONTROLS_KEY, controlSettings, rebind, keyName, buttonName } from './bindings.mjs';

const $ = id => document.getElementById(id);
const down = button => button?.pressed || button?.value > .55;

export class ControlPanel {
  constructor(controllers, onChange) {
    this.controllers = controllers; this.onChange = onChange; this.player = 0; this.capture = null;
    let saved;
    try { saved = localStorage.getItem(CONTROLS_KEY); } catch { this.storageError = true; }
    try { this.settings = controlSettings(JSON.parse(saved || 'null')); } catch { this.settings = controlSettings(); }
    controllers.configure(this.settings);
    document.querySelectorAll('[data-control-player]').forEach(button => button.addEventListener('click', () => { this.cancel(); this.player = Number(button.dataset.controlPlayer); this.render(); }));
    $('cancel-binding').addEventListener('click', () => this.cancel());
    $('default-controls').addEventListener('click', () => { this.cancel(); this.settings = controlSettings(); this.save(); });
    $('swap-controllers').addEventListener('click', () => { this.cancel(); controllers.swap(); onChange(); this.assignments(); });
    for (const [id, key] of [['horizontal-zone', 'deadZone'], ['vertical-zone', 'verticalDeadZone']]) {
      $(id).addEventListener('input', event => { this.settings.players[this.player][key] = Number(event.target.value) / 100; this.save(false); });
    }
    $('controls-dialog').addEventListener('close', () => this.cancel());
    $('controls-dialog').addEventListener('cancel', event => { if (this.capture) { event.preventDefault(); this.cancel(); } });
    this.render();
  }
  save(render = true) {
    this.settings = controlSettings(this.settings);
    try { localStorage.setItem(CONTROLS_KEY, JSON.stringify(this.settings)); this.storageError = false; }
    catch { this.storageError = true; }
    this.controllers.configure(this.settings); this.onChange();
    if (render) this.render(); else this.zones();
    this.storageStatus();
  }
  storageStatus() { $('controls-save-status').textContent = this.storageError ? 'Browser storage is unavailable. These controls work until this page is reloaded.' : 'Control profiles save in this browser. Restoring defaults resets both players.'; }
  render() {
    const profile = this.settings.players[this.player];
    document.querySelectorAll('[data-control-player]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.controlPlayer) === this.player)));
    $('bindings-title').textContent = `P${this.player + 1} bindings`;
    $('binding-rows').replaceChildren(...Object.entries(ACTIONS).map(([action, label]) => {
      const row = document.createElement('tr'), name = document.createElement('th'); name.scope = 'row'; name.textContent = label; row.append(name);
      for (const device of ['keyboard', 'buttons']) {
        const cell = document.createElement('td');
        if (device === 'buttons' && !Object.hasOwn(profile.buttons, action)) cell.textContent = 'Stick / D-pad';
        else {
          const button = document.createElement('button'); button.className = 'binding-button'; button.dataset.bindAction = action; button.dataset.bindDevice = device;
          button.textContent = device === 'keyboard' ? keyName(profile.keyboard[action]) : buttonName(profile.buttons[action]);
          button.setAttribute('aria-label', `P${this.player + 1} ${label}, ${device === 'keyboard' ? 'keyboard' : 'controller'}: ${button.textContent}. Rebind`);
          button.addEventListener('click', () => this.listen(action, device)); cell.append(button);
        }
        row.append(cell);
      }
      return row;
    }));
    this.zones(); this.storageStatus(); this.assignments();
  }
  zones() {
    for (const [id, key] of [['horizontal-zone', 'deadZone'], ['vertical-zone', 'verticalDeadZone']]) {
      $(id).value = Math.round(this.settings.players[this.player][key] * 100);
      $(id + '-value').textContent = $(id).value + '%';
      $(id).setAttribute('aria-label', `P${this.player + 1} ${id === 'horizontal-zone' ? 'horizontal' : 'vertical'} stick dead zone`);
    }
  }
  assignments() {
    for (let i = 0; i < 2; i++) {
      const slot = this.controllers.slots[i];
      const text = slot ? `P${i + 1}: ${slot.id} · ${slot.armed ? 'ready' : 'release controls to join'}` : `P${i + 1}: keyboard · no controller assigned`;
      if ($('assignment-' + i).textContent !== text) $('assignment-' + i).textContent = text;
    }
    $('swap-controllers').disabled = !this.controllers.slots.some(Boolean);
  }
  listen(action, device) {
    this.capture = { action, device, player: this.player, armed: false };
    this.controllers.clear();
    $('binding-capture').textContent = device === 'keyboard' ? `P${this.player + 1} ${ACTIONS[action]}: press a key. Escape cancels; Tab keeps keyboard navigation available.` : `P${this.player + 1} ${ACTIONS[action]}: release controls on the assigned controller, then press a button. Start or Escape cancels.`;
    $('cancel-binding').hidden = false;
  }
  cancel() { this.capture = null; $('binding-capture').textContent = ''; $('cancel-binding').hidden = true; this.controllers.clear(); }
  apply(value) {
    const { player, device, action } = this.capture;
    try {
      this.settings = rebind(this.settings, player, device, action, value); this.cancel(); this.save();
      const button = document.querySelector(`[data-bind-action="${action}"][data-bind-device="${device}"]`); button?.focus({ preventScroll: true });
      $('binding-capture').textContent = `${ACTIONS[action]} updated. Shared bindings within this player swap automatically.`;
    } catch (error) { this.capture.armed = false; $('binding-capture').textContent = error.message + ' Try again, or cancel.'; }
  }
  keydown(event) {
    if (!this.capture) return false;
    if (event.code === 'Escape') { event.preventDefault(); this.cancel(); return true; }
    if (['Enter', 'Space'].includes(event.code) && event.target.tagName === 'BUTTON' && !event.target.dataset.bindAction) return false;
    if (this.capture.device !== 'keyboard' || event.code === 'Tab' || event.ctrlKey || event.metaKey || event.altKey) return false;
    event.preventDefault(); if (!event.repeat) this.apply(event.code); return true;
  }
  poll(pads) {
    if ($('controls-dialog').open) this.assignments();
    if (!this.capture) return;
    if (pads.some(pad => pad?.connected && down(pad.buttons[9]))) { this.cancel(); return; }
    if (this.capture.device !== 'buttons') return;
    const { player } = this.capture, slot = this.controllers.slots[player];
    const pad = pads.find(pad => pad?.connected && pad.index === slot?.index && pad.id === slot?.id);
    if (!pad) return;
    const pressed = pad.buttons.map((button, index) => down(button) ? index : -1).filter(index => index >= 0);
    if (!this.capture.armed) { this.capture.armed = !pressed.length; return; }
    if (pressed.length === 1) this.apply(pressed[0]);
  }
}
