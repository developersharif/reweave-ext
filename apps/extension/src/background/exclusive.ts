/**
 * Runs background state changes one at a time. Requests, permission events and
 * startup all read-modify-write storage and registrations; interleaving them could
 * register the same content script twice or lose a write.
 */
let tail: Promise<unknown> = Promise.resolve();

export function exclusive<T>(task: () => Promise<T>): Promise<T> {
  const run = tail.then(task, task);
  tail = run.catch(() => undefined);
  return run;
}
