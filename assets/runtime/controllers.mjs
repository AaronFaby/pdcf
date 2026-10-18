import { controlSettings } from './bindings.mjs';

const pressed = (pad, index) => !!pad.buttons[index]?.pressed || pad.buttons[index]?.value > .55;
const savedID = key => key.slice(key.indexOf(':') + 1);

export function readPad(pad, profile = controlSettings().players[0]) {
  const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
  const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
  return {
    left: x < -profile.deadZone || pressed(pad, 14), right: x > profile.deadZone || pressed(pad, 15),
    up: y < -profile.verticalDeadZone || pressed(pad, 12), down: y > profile.verticalDeadZone || pressed(pad, 13),
    ...Object.fromEntries(Object.entries(profile.buttons).map(([action, button]) => [action, pressed(pad, button)])),
    jump: pressed(pad, profile.buttons.jump) || pressed(pad, 12) || y < -profile.verticalDeadZone,
    guard: pressed(pad, profile.buttons.guard) || pressed(pad, 13) || y > profile.verticalDeadZone,
    confirm: pressed(pad, 0), cancel: pressed(pad, 1) || pressed(pad, 8), pause: pressed(pad, 9)
  };
}

export class Controllers {
  constructor(settings) { this.slots = [null, null]; this.assignments = new Map(); this.settings = controlSettings(settings); }
  configure(settings) { this.settings = controlSettings(settings); this.clear(); }
  swap() {
    this.slots.reverse();
    for (const [key, player] of this.assignments) this.assignments.set(key, 1 - player);
    this.clear();
  }
  clear() {
    for (const slot of this.slots) if (slot) { slot.armed = false; slot.pending = {}; slot.state = {}; }
  }
  poll(gamepads) {
    const pads = Array.from(gamepads || []).filter(p => p?.connected && p.mapping === 'standard');
    const disconnected = [];
    this.slots.forEach((slot, i) => {
      if (slot && !pads.some(p => p.index === slot.index && p.id === slot.id)) { this.slots[i] = null; disconnected.push(i); }
    });
    // Reserve exact matches before an identical-ID fallback can take their slots.
    const joining = pads.filter(pad => !this.slots.some(slot => slot?.index === pad.index));
    const known = new Set([...this.assignments.keys()].map(savedID));
    const priority = pad => this.assignments.has(`${pad.index}:${pad.id}`) ? 2 : Number(known.has(pad.id));
    joining.sort((a, b) => priority(b) - priority(a));
    for (const pad of joining) {
      if (this.slots.some(slot => slot?.index === pad.index)) continue;
      const key = `${pad.index}:${pad.id}`;
      const previous = this.assignments.get(key) ?? [...this.assignments].find(([saved, player]) => savedID(saved) === pad.id && this.slots[player] === null)?.[1];
      const vacant = previous !== undefined && this.slots[previous] === null ? previous : this.slots.indexOf(null);
      if (vacant !== -1) {
        this.slots[vacant] = { index: pad.index, id: pad.id, armed: false, state: {}, pending: {} };
        // Obsolete index aliases must not restore an assignment from before a player change.
        for (const saved of this.assignments.keys()) if (savedID(saved) === pad.id && !pads.some(other => `${other.index}:${other.id}` === saved)) this.assignments.delete(saved);
        this.assignments.set(key, vacant);
      }
    }
    const menus = [];
    for (const [index, slot] of this.slots.entries()) {
      if (!slot) continue;
      const pad = pads.find(p => p.index === slot.index), state = readPad(pad, this.settings.players[index]);
      const edges = {};
      if (!slot.armed) {
        // Require neutral after joining, pausing or changing screens so held buttons cannot leak through.
        slot.armed = !Object.values(state).some(Boolean) && !pad.buttons.some((_, index) => pressed(pad, index));
        slot.state = {}; slot.pending = {};
        continue;
      }
      for (const [action, down] of Object.entries(state)) if (down && !slot.state[action]) edges[action] = true;
      Object.assign(slot.pending, edges);
      slot.state = state; menus.push({ ...edges, player: index });
    }
    return { disconnected, menus, count: this.slots.filter(Boolean).length };
  }
  consume(index) {
    const slot = this.slots[index];
    if (!slot?.armed) return {};
    const input = { ...slot.pending, left: !!slot.state.left, right: !!slot.state.right, guard: !!slot.state.guard };
    slot.pending = {};
    return input;
  }
}
