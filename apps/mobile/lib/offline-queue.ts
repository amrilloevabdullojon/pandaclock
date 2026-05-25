import * as SecureStore from "expo-secure-store";

const KEY = "pcl.queue.v1";

export type QueuedAction =
  | { type: "START_DAY"; payload: { latitude?: number; longitude?: number; note?: string } }
  | { type: "FINISH_DAY"; payload: { latitude?: number; longitude?: number } }
  | { type: "START_BREAK"; payload: { type?: string } }
  | { type: "FINISH_BREAK"; payload: Record<string, never> };

export async function readQueue(): Promise<QueuedAction[]> {
  const raw = await SecureStore.getItemAsync(KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QueuedAction[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function enqueue(action: QueuedAction): Promise<void> {
  const queue = await readQueue();
  queue.push(action);
  await SecureStore.setItemAsync(KEY, JSON.stringify(queue));
}

export async function clearQueue(): Promise<void> {
  await SecureStore.deleteItemAsync(KEY);
}

export async function drainQueue(
  apply: (action: QueuedAction) => Promise<void>,
): Promise<{ flushed: number; failed: number }> {
  const queue = await readQueue();
  if (queue.length === 0) return { flushed: 0, failed: 0 };

  const remaining: QueuedAction[] = [];
  let flushed = 0;
  for (const action of queue) {
    try {
      await apply(action);
      flushed += 1;
    } catch {
      remaining.push(action);
    }
  }
  if (remaining.length === 0) {
    await SecureStore.deleteItemAsync(KEY);
  } else {
    await SecureStore.setItemAsync(KEY, JSON.stringify(remaining));
  }
  return { flushed, failed: remaining.length };
}
