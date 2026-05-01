// Per-agent mutex — serializes vault writes so two sessions ending
// simultaneously don't corrupt summary.md or index.md.
const locks = new Map<string, Promise<void>>();

export async function withAgentLock<T>(
  agentId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const prev = locks.get(agentId) ?? Promise.resolve();

  let release!: () => void;
  const curr = new Promise<void>((resolve) => {
    release = resolve;
  });
  locks.set(agentId, curr);

  await prev;
  try {
    return await fn();
  } finally {
    release();
    // Clean up if no other waiters queued after us
    if (locks.get(agentId) === curr) {
      locks.delete(agentId);
    }
  }
}
