const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveInteger = value => Number.isSafeInteger(value) && value >= 1;

// Accept older backups with omitted fields, but reject incompatible field types.
export function validateBackup(data, defaults, itemIds) {
  if (!record(data) || !Array.isArray(data.members) || data.members.length < 1 || data.members.length > defaults.length) {
    throw new Error('Invalid members');
  }
  const ids = new Set();
  const members = defaults.map((fallback, index) => {
    const member = data.members[index];
    if (member === undefined) return { ...fallback, wants: { ...fallback.wants }, gets: { ...fallback.gets } };
    if (!record(member)) throw new Error('Invalid member');
    const { id = fallback.id, name = fallback.name, job = '', wants = {}, gets = {} } = member;
    if (typeof id !== 'string' || !id || ids.has(id) || typeof name !== 'string' || typeof job !== 'string'
      || !record(wants) || !record(gets)) throw new Error('Invalid member fields');
    ids.add(id);
    const cleanWants = {}, cleanGets = {};
    for (const key of itemIds) {
      const want = wants[key] ?? false, get = gets[key] ?? 0;
      if (typeof want !== 'boolean' || !Number.isSafeInteger(get) || get < 0) throw new Error('Invalid item counts');
      cleanWants[key] = want;
      cleanGets[key] = get;
    }
    return { id, name, job, wants: cleanWants, gets: cleanGets };
  });
  if (new Set(members.map(m => m.id)).size !== members.length) throw new Error('Duplicate member IDs');
  const contentCycle = data.contentCycle === undefined ? 1 : data.contentCycle;
  const rawHistory = data.history === undefined ? [] : data.history;
  if (!positiveInteger(contentCycle) || !Array.isArray(rawHistory)) throw new Error('Invalid cycle or history');
  const historyIds = new Set();
  const history = rawHistory.map(entry => {
    if (!record(entry) || typeof entry.id !== 'string' || !entry.id || historyIds.has(entry.id)
      || !members.some(m => m.id === entry.memberId) || !itemIds.includes(entry.itemId)
      || !positiveInteger(entry.cycle) || typeof entry.timestamp !== 'string') throw new Error('Invalid history entry');
    historyIds.add(entry.id);
    return { id: entry.id, memberId: entry.memberId, itemId: entry.itemId, cycle: entry.cycle, timestamp: entry.timestamp };
  });
  return { members, history, contentCycle };
}
