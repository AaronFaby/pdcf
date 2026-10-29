import test from 'node:test';
import assert from 'node:assert/strict';
import { BACKUP_LIMIT, SAVE_KEYS, exportBackup, parseBackup, importBackup } from '../assets/runtime/save-transfer.mjs';
import { createArcade, arcadeMatch } from '../assets/runtime/arcade.mjs';
import { controlSettings, rebind } from '../assets/runtime/bindings.mjs';
import { visualSettings } from '../assets/runtime/visuals.mjs';
import { audioSettings } from '../assets/runtime/audio.mjs';

function storage(values = {}) {
  const data = new Map(Object.entries(values));
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key) };
}
function saved() {
  const run = createArcade('betty', 'hard', () => .3); arcadeMatch(run);
  return Object.fromEntries(SAVE_KEYS.map((key, i) => [key, JSON.stringify([run, rebind(controlSettings(), 0, 'keyboard', 'punch', 'KeyQ'), audioSettings({ enabled: false, music: .2, effects: .8 }), visualSettings({ motion: 'reduced', shake: false })][i])]));
}

test('a backup transfers all four categories without deleting the source or unrelated destination data', () => {
  const original = saved(), source = storage(original), target = storage({ unrelated: 'keep' });
  const backup = exportBackup(source);
  assert.equal(backup.data[SAVE_KEYS[0]].status, 'ready');
  assert.deepEqual(Object.fromEntries(source.data), original, 'an interrupted Arcade run is not rewritten at its origin');
  assert.equal(importBackup(target, backup), 4);
  assert.equal(JSON.parse(target.getItem(SAVE_KEYS[1])).players[0].keyboard.punch, 'KeyQ');
  assert.equal(JSON.parse(target.getItem(SAVE_KEYS[2])).enabled, false);
  assert.equal(JSON.parse(target.getItem(SAVE_KEYS[3])).motion, 'reduced');
  assert.equal(target.getItem('unrelated'), 'keep');
  assert.deepEqual(exportBackup(target), backup);
  assert.equal(exportBackup(storage()), null);
});

test('partial imports preserve other categories, completed endings and valid property order', () => {
  const target = storage(saved()), run = createArcade('popeye'); run.index = 6; run.attempts = 6; run.status = 'complete';
  const backup = parseBackup(JSON.stringify({ format: 'pdcf-save', version: 1, data: { [SAVE_KEYS[0]]: run } }));
  assert.throws(() => importBackup(target, backup), /Confirm replacement/);
  const controls = target.getItem(SAVE_KEYS[1]);
  importBackup(target, backup, true);
  assert.equal(JSON.parse(target.getItem(SAVE_KEYS[0])).status, 'complete');
  assert.equal(target.getItem(SAVE_KEYS[1]), controls);
  const audio = { effects: .8, music: .2, enabled: false };
  assert.equal(parseBackup(JSON.stringify({ format: 'pdcf-save', version: 1, data: { [SAVE_KEYS[2]]: audio } })).data[SAVE_KEYS[2]].music, .2);
});

test('untrusted backup contents are bounded and rejected before storage writes', () => {
  const good = exportBackup(storage(saved()));
  for (const value of [null, {}, { ...good, version: 2 }, { ...good, data: {} }, { ...good, data: { token: 'private' } }, { ...good, data: { '__proto__': {}, unknown: 'no' } }]) assert.throws(() => parseBackup(JSON.stringify(value)));
  for (const [key, value] of [[SAVE_KEYS[0], { version: 1, fighter: 'unknown' }], [SAVE_KEYS[1], { version: 1, players: [] }], [SAVE_KEYS[2], { enabled: 'false', music: .2, effects: .7 }], [SAVE_KEYS[3], { motion: 'reduced' }]]) {
    assert.throws(() => parseBackup(JSON.stringify({ ...good, data: { [key]: value } })), /invalid/);
  }
  assert.throws(() => parseBackup('x'.repeat(BACKUP_LIMIT + 1)), /limit/);
  assert.throws(() => parseBackup('é'.repeat(BACKUP_LIMIT / 2 + 1)), /limit/);
  assert.throws(() => parseBackup('{broken'), /valid PDCF/);
  assert.throws(() => exportBackup(storage({ [SAVE_KEYS[0]]: '{broken' })), /damaged/);
});

test('quota failure rolls back existing and new categories without touching unrelated keys', () => {
  const before = { [SAVE_KEYS[0]]: JSON.stringify(createArcade('mickey')), unrelated: 'keep' }, target = storage(before);
  const write = target.setItem; let count = 0;
  target.setItem = (key, value) => { if (++count === 3) throw Error('Quota'); return write(key, value); };
  assert.throws(() => importBackup(target, exportBackup(storage(saved())), true), /Previous data was restored/);
  assert.deepEqual(Object.fromEntries(target.data), before);
  const blocked = { getItem() { throw Error('Storage blocked'); }, setItem() { assert.fail('must not write'); } };
  assert.throws(() => exportBackup(blocked), /Storage blocked/);
  assert.throws(() => importBackup(blocked, exportBackup(storage(saved())), true), /Storage blocked/);
});

test('a failed rollback reports partial changes rather than claiming an atomic import', () => {
  const target = storage({ [SAVE_KEYS[0]]: JSON.stringify(createArcade('mickey')) }), write = target.setItem; let count = 0;
  target.setItem = (key, value) => { if (++count > 1) throw Error('Storage revoked'); return write(key, value); };
  assert.throws(() => importBackup(target, exportBackup(storage(saved())), true), /Some categories may have changed/);
  assert.equal(JSON.parse(target.getItem(SAVE_KEYS[0])).fighter, 'betty');
});
