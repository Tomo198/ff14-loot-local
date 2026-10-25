import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBackup } from '../src/utils/backup.js';

const defaults = Array.from({ length: 8 }, (_, i) => ({ id: `member-${i}`, name: `Member ${i}`, job: '', wants: { weapon: false }, gets: { weapon: 0 } }));
const valid = () => ({ members: structuredClone(defaults), history: [{ id: 'h1', memberId: 'member-0', itemId: 'weapon', cycle: 1, timestamp: '12:00' }], contentCycle: 2 });
const validate = data => validateBackup(data, defaults, ['weapon']);

test('round trip preserves valid backup without mutating it', () => {
  const data = valid(), before = structuredClone(data);
  data.members[0].wants.weapon = true;
  data.members[0].gets.weapon = 2;
  assert.deepEqual(validate(data), data);
  assert.equal(before.members[0].gets.weapon, 0);
  assert.equal(defaults[0].gets.weapon, 0);
});
test('older partial backup receives missing fields and members', () => {
  const data = validate({ members: [{ name: 'Older member' }] });
  assert.equal(data.members.length, 8);
  assert.equal(data.members[0].name, 'Older member');
  assert.equal(data.members[0].gets.weapon, 0);
  assert.deepEqual(data.history, []);
  assert.equal(data.contentCycle, 1);
});
test('invalid ordinary structures and boundary counts are rejected', () => {
  for (const members of [null, {}, [], [null], Array(9).fill(defaults[0])]) {
    assert.throws(() => validate({ members }));
  }
  for (const count of [-1, 1.5, '2', Number.MAX_SAFE_INTEGER + 1]) {
    const data = valid(); data.members[0].gets.weapon = count;
    assert.throws(() => validate(data));
  }
  for (const cycle of [0, -1, 1.5, '2', null]) {
    assert.throws(() => validate({ ...valid(), contentCycle: cycle }));
  }
});
test('duplicate identities and incompatible history are rejected', () => {
  const duplicate = valid(); duplicate.members[1].id = duplicate.members[0].id;
  assert.throws(() => validate(duplicate));
  for (const history of [{}, [null], [{ ...valid().history[0], memberId: 'missing' }], [{ ...valid().history[0], itemId: 'unknown' }]]) {
    assert.throws(() => validate({ ...valid(), history }));
  }
});
