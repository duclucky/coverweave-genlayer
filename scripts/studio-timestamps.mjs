// Server consensus monitoring contains Unix seconds, not observation times.
export function networkTimes(receipt) {
  const history = receipt?.consensus_history;
  const monitoring = [history?.current_monitoring,
    ...(Array.isArray(history?.consensus_results) ? history.consensus_results.map(round => round?.monitoring) : [])];
  const time = state => {
    const values = monitoring.map(item => item?.[state]).filter(value =>
      typeof value === 'number' && Number.isFinite(value) && value > 1500000000 && value < 4102444800);
    return values.length ? new Date(Math.max(...values) * 1000).toISOString() : null;
  };
  return { networkAcceptedAt: time('ACCEPTED'), networkFinalizedAt: time('FINALIZED') };
}
