const STORAGE_KEY = 'propuesta_unlocked_secrets';

export function getUnlockedSecrets(): number[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as number[]) : [];
  } catch {
    return [];
  }
}

export function isEventSecretUnlocked(eventId: number): boolean {
  return getUnlockedSecrets().includes(eventId);
}

export function unlockSecretEvent(eventId: number): void {
  const unlocked = getUnlockedSecrets();
  if (!unlocked.includes(eventId)) {
    unlocked.push(eventId);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
    } catch {
      // ignore
    }
    window.dispatchEvent(new CustomEvent('secret_unlocked', { detail: { eventId } }));
  }
}

export function lockSecretEvent(eventId: number): void {
  const unlocked = getUnlockedSecrets().filter((id) => id !== eventId);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked));
  } catch {
    // ignore
  }
  window.dispatchEvent(new CustomEvent('secret_locked', { detail: { eventId } }));
}
