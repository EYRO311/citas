const STORAGE_KEY = 'propuesta_admin_pin';
const DEFAULT_PIN = '1234';

export function getAdminPIN(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_PIN;
  } catch {
    return DEFAULT_PIN;
  }
}

export function setAdminPIN(newPin: string): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, newPin);
    return true;
  } catch {
    return false;
  }
}
