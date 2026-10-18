import test from 'node:test';
import assert from 'node:assert/strict';
import { controlSettings, rebind } from '../assets/runtime/bindings.mjs';
import { Controllers, readPad } from '../assets/runtime/controllers.mjs';
import { fighterMoves } from '../assets/runtime/move-list.mjs';
import { ROSTER, createMatch, tick } from '../engine.mjs';

const pad = (index = 0, buttons = [], axes = [0, 0]) => ({ index, id: `Test pad ${index}`, connected: true, mapping: 'standard', axes, buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: buttons.includes(i), value: buttons.includes(i) ? 1 : 0 })) });

test('control profiles validate saved data, stay independent, and recover invalid maps', () => {
  const defaults = controlSettings();
  for (const value of [null, {}, [], { version: 2, players: defaults.players }, { version: 1, players: [null] }]) assert.deepEqual(controlSettings(value), defaults);
  const custom = rebind(defaults, 0, 'keyboard', 'punch', 'KeyQ');
  custom.players[0].deadZone = .6; custom.players[1].verticalDeadZone = .25;
  assert.deepEqual(controlSettings(JSON.parse(JSON.stringify(custom))), custom);
  assert.equal(defaults.players[0].keyboard.punch, 'KeyF');
  const bad = structuredClone(custom);
  bad.players[0].keyboard.kick = 'KeyQ'; bad.players[1].buttons.jump = 9;
  bad.players[0].deadZone = Infinity; bad.players[1].deadZone = -.1; bad.players[0].verticalDeadZone = 4;
  const recovered = controlSettings(bad);
  assert.deepEqual(recovered.players[0].keyboard, defaults.players[0].keyboard);
  assert.deepEqual(recovered.players[1].buttons, defaults.players[1].buttons);
  assert.equal(recovered.players[0].deadZone, .3); assert.equal(recovered.players[1].deadZone, .1); assert.equal(recovered.players[0].verticalDeadZone, .8);
  bad.players[0].keyboard = Object.create(custom.players[0].keyboard);
  assert.deepEqual(controlSettings(bad).players[0].keyboard, defaults.players[0].keyboard);
  bad.players[0].keyboard = { ...defaults.players[0].keyboard, punch: 'KeyJ' };
  assert.deepEqual(controlSettings(bad).players.map(p => p.keyboard), defaults.players.map(p => p.keyboard));
});

test('rebinding swaps within a player, rejects shared keyboard keys and keeps escape routes reserved', () => {
  const defaults = controlSettings();
  const keyboard = rebind(defaults, 0, 'keyboard', 'punch', 'KeyG');
  assert.equal(keyboard.players[0].keyboard.punch, 'KeyG'); assert.equal(keyboard.players[0].keyboard.kick, 'KeyF');
  const buttons = rebind(defaults, 1, 'buttons', 'punch', 3);
  assert.equal(buttons.players[1].buttons.punch, 3); assert.equal(buttons.players[1].buttons.kick, 2);
  assert.throws(() => rebind(defaults, 0, 'keyboard', 'jump', 'ArrowUp'), /P2 Jump/);
  for (const code of ['Escape', 'Tab', 'ControlLeft', 'MetaLeft', '', '<script>']) assert.throws(() => rebind(defaults, 0, 'keyboard', 'jump', code), /reserved/);
  for (const button of [9, 12, 15, -1, 16, .5, '2']) assert.throws(() => rebind(defaults, 0, 'buttons', 'jump', button), /reserved/);
  assert.throws(() => rebind(defaults, 2, 'keyboard', 'jump', 'KeyQ'), /Unknown/);
});

test('custom buttons and independent stick thresholds keep D-pad and menu buttons fixed', () => {
  const settings = rebind(controlSettings(), 0, 'buttons', 'punch', 6), profile = settings.players[0];
  profile.deadZone = .6; profile.verticalDeadZone = .25;
  assert.equal(readPad(pad(0, [6], [.5, -.3]), profile).punch, true);
  assert.equal(readPad(pad(0, [2], [.5, -.3]), profile).punch, false);
  assert.equal(readPad(pad(0, [], [.5, -.3]), profile).right, false);
  assert.equal(readPad(pad(0, [], [.61, -.3]), profile).right, true);
  assert.equal(readPad(pad(0, [], [.6, -.25]), profile).jump, false);
  assert.equal(readPad(pad(0, [], [NaN, Infinity]), profile).jump, false);
  assert.equal(readPad(pad(0, [15, 12]), profile).right, true); assert.equal(readPad(pad(0, [12]), profile).jump, true);
  const swapped = rebind(settings, 0, 'buttons', 'jump', 1).players[0];
  assert.equal(readPad(pad(0, [0, 9]), swapped).confirm, true); assert.equal(readPad(pad(0, [1]), swapped).cancel, true); assert.equal(readPad(pad(0, [9]), swapped).pause, true);
});

test('profiles follow player slots through swap and reverse reconnect; held input must rearm', () => {
  const settings = rebind(rebind(controlSettings(), 0, 'buttons', 'punch', 6), 1, 'buttons', 'punch', 10);
  const controllers = new Controllers(settings); controllers.poll([pad(0), pad(1)]);
  controllers.poll([pad(0, [6]), pad(1, [10])]);
  assert.equal(controllers.consume(0).punch, true); assert.equal(controllers.consume(1).punch, true);
  controllers.swap(); controllers.poll([pad(0, [6]), pad(1, [10])]);
  assert.deepEqual(controllers.consume(0), {}); assert.deepEqual(controllers.consume(1), {});
  controllers.poll([pad(0), pad(1)]); controllers.poll([pad(0, [10]), pad(1, [6])]);
  assert.equal(controllers.consume(0).punch, true); assert.equal(controllers.consume(1).punch, true);
  controllers.poll([]); controllers.poll([pad(0)]); assert.equal(controllers.slots[1].index, 0);
  controllers.poll([pad(1), pad(0)]); assert.deepEqual(controllers.slots.map(s => s.index), [1, 0]);
  controllers.configure(settings); controllers.poll([pad(0, [10]), pad(1, [6])]); assert.deepEqual(controllers.consume(0), {});
});

test('move lists match actual damage for all six fighters, including projectiles and spinach', () => {
  const profile = rebind(controlSettings(), 1, 'keyboard', 'punch', 'KeyU').players[1];
  for (const fighter of ROSTER) {
    const moves = fighterMoves(fighter.id, profile);
    assert.equal(moves.length, 4); assert.equal(moves[0].keyboard, 'U');
    for (const move of moves) {
      const match = createMatch(fighter.id, 'mickey'); match.phase = 'fight';
      match.fighters[0].x = 500; match.fighters[1].x = 580; match.fighters[0].hp = 90;
      tick(match, [{ [move.kind]: true }, {}], 1 / 120);
      for (let i = 0; i < 110; i++) tick(match, [{}, {}], 1 / 120);
      assert.ok(Math.abs(100 - match.fighters[1].hp - move.damage) < 1e-8, `${fighter.id} ${move.kind} damage`);
      if (fighter.id === 'popeye' && move.kind === 'special') { assert.equal(match.fighters[0].hp, 98); assert.ok(match.fighters[0].buff > 5); }
    }
  }
  assert.throws(() => fighterMoves('unknown', profile), /Unknown/);
});

test('move lists expose fighter timing differences and current button bindings', () => {
  const profile = rebind(controlSettings(), 0, 'buttons', 'kick', 6).players[0];
  const minnie = fighterMoves('minnie', profile), popeye = fighterMoves('popeye', profile);
  assert.equal(minnie[0].startup, 5); assert.equal(popeye[0].startup, 9);
  assert.equal(minnie[1].controller, 'LT / L2'); assert.equal(popeye[2].recovery, 29); assert.equal(popeye[3].recovery, 31);
  assert.equal(fighterMoves('mickey', profile)[3].recovery, 31);
  assert.match(popeye[3].note, /35 ink.*8 health.*50%.*6 seconds/);
});
