export type AlertPreferenceKind = "read" | "dismissed";

function key(userId: string, kind: AlertPreferenceKind) {
  return `finance-alerts-${kind}:${userId}`;
}

function parseIds(value: string | null) {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? [...new Set(parsed.filter((item): item is string => typeof item === "string"))] : [];
  } catch {
    return [];
  }
}

export function readAlertPreference(storage: Pick<Storage, "getItem">, userId: string, kind: AlertPreferenceKind) {
  return parseIds(storage.getItem(key(userId, kind)));
}

export function writeAlertPreference(storage: Pick<Storage, "setItem">, userId: string, kind: AlertPreferenceKind, ids: string[]) {
  const normalized = [...new Set(ids.filter(Boolean))];
  storage.setItem(key(userId, kind), JSON.stringify(normalized));
  return normalized;
}
