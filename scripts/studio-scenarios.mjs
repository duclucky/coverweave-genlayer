// Bounded demonstrations; expected vectors are assertions, never contract inputs.
const scenarios = {
  dummy: {
    goal: 'Read the registered record.',
    terms: ['The holder may read the registered record.', 'The holder may export a saved copy of the registered record.'],
    expectedClasses: ['COMPLETE', 'INCOMPLETE', 'COMPLETE'],
  },
  gap: {
    goal: 'Read the registered record and delete its archived copy.',
    terms: ['The holder may read the registered record.', 'The holder may export a saved copy of the registered record.'],
    expectedClasses: ['INCOMPLETE', 'INCOMPLETE', 'INCOMPLETE'],
  },
  expiry: { goal: 'Read the registered record.', terms: [], expectedClasses: null },
};

export function prepareScenario(journal, name, now) {
  const specification = scenarios[name];
  if (!specification) throw new Error('Unknown bounded lifecycle scenario.');
  if (!Number.isSafeInteger(now) || now <= 0) throw new Error('Invalid scenario timestamp.');
  journal.demos ??= {};
  if (!journal.demos[name]) journal.demos[name] = {
    ...specification, id: 'cw-studio-' + name + '-20261007-01',
    offerDeadline: now + (name === 'expiry' ? 120 : 3600),
    reviewDeadline: now + (name === 'expiry' ? 180 : 7200),
    useDeadline: now + (name === 'expiry' ? 240 : 10800),
    recovery: 'Actual settled credits -> immutable owners withdraw -> buyer closes; pending expiry -> buyer refund first.',
  };
  return journal.demos[name];
}

export function recoveryActions(bundle, credits) {
  if (bundle.status === 'CLOSED') return [];
  if (!['PURCHASED', 'REFUNDED'].includes(bundle.status))
    throw new Error('Pending judgment requires diagnosis or expired refund before recovery.');
  const values = ['buyer', 'issuerA', 'issuerB'].map(role => credits[role]);
  if (values.some(value => !['0', '1', '2'].includes(value)) || values.reduce((sum, value) => sum + Number(value), 0) > 2)
    throw new Error('Invalid canonical credit accounting.');
  const actions = [];
  if (bundle.status === 'PURCHASED' && bundle.permit === 'AVAILABLE')
    actions.push({ role: 'buyer', method: 'consume_permit' });
  for (const role of ['buyer', 'issuerA', 'issuerB'])
    if (credits[role] !== '0') actions.push({ role, method: 'withdraw_credit' });
  actions.push({ role: 'buyer', method: 'close_bundle' });
  return actions;
}
