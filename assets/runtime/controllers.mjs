const pressed = (pad, index) => !!pad.buttons[index]?.pressed || pad.buttons[index]?.value > .55;

export function readPad(pad) {
  const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
  const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
  return {
    left: x < -.3 || pressed(pad, 14), right: x > .3 || pressed(pad, 15),
    up: y < -.55 || pressed(pad, 12), down: y > .55 || pressed(pad, 13),
    jump: pressed(pad, 0) || pressed(pad, 12) || y < -.55,
    punch: pressed(pad, 2), kick: pressed(pad, 3), special: pressed(pad, 1),
    throw: pressed(pad, 5), dash: pressed(pad, 7), guard: pressed(pad, 4) || pressed(pad, 13) || y > .55,
    confirm: pressed(pad, 0), cancel: pressed(pad, 1) || pressed(pad, 8), pause: pressed(pad, 9)
  };
}

export class Controllers {
  constructor() { this.slots = [null, null]; this.assignments = new Map(); }
  clear() {
    for (const slot of this.slots) if (slot) { slot.armed = false; slot.pending = {}; slot.state = {}; }
  }
  poll(gamepads) {
    const pads = Array.from(gamepads || []).filter(p => p?.connected && p.mapping === 'standard');
    const disconnected = [];
    this.slots.forEach((slot, i) => {
      if (slot && !pads.some(p => p.index === slot.index && p.id === slot.id)) { this.slots[i] = null; disconnected.push(i); }
    });
    for (const pad of pads) {
      if (this.slots.some(slot => slot?.index === pad.index)) continue;
      const key = `${pad.index}:${pad.id}`, previous = this.assignments.get(key);
      const vacant = previous !== undefined && this.slots[previous] === null ? previous : this.slots.indexOf(null);
      if (vacant !== -1) {
        this.slots[vacant] = { index: pad.index, id: pad.id, armed: false, state: {}, pending: {} };
        this.assignments.set(key, vacant);
      }
    }
    const menus = [];
    for (const slot of this.slots) {
      if (!slot) continue;
      const pad = pads.find(p => p.index === slot.index), state = readPad(pad);
      const edges = {};
      if (!slot.armed) {
        // Require neutral after joining, pausing or changing screens so held buttons cannot leak through.
        slot.armed = !Object.values(state).some(Boolean);
        slot.state = {}; slot.pending = {};
        continue;
      }
      for (const [action, down] of Object.entries(state)) if (down && !slot.state[action]) edges[action] = true;
      Object.assign(slot.pending, edges);
      slot.state = state; menus.push(edges);
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
