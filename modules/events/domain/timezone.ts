// ==============================================================================
// Todas las citas son horario del Centro de México (UTC-6, sin horario de
// verano desde 2022). Calculamos el timestamp a partir de UTC + un offset fijo
// en vez de depender de la zona horaria del dispositivo que renderiza la
// página: así el cronómetro muestra la cuenta regresiva correcta sin importar
// si el servidor (Vercel suele correr en UTC) o el celular de quien lo ve
// tienen configurada otra zona horaria.
// ==============================================================================

const MEXICO_CITY_UTC_OFFSET_MINUTES = 6 * 60;

export function parseMexicoCityDateTime(dateStr: string, timeStr: string): number {
  if (!dateStr) return NaN;
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = (timeStr || '00:00').split(':').map(Number);
  if (!year || !month || !day) return NaN;

  return Date.UTC(year, month - 1, day, hour || 0, minute || 0, 0) + MEXICO_CITY_UTC_OFFSET_MINUTES * 60 * 1000;
}

// Inverso de parseMexicoCityDateTime: a partir de un timestamp, arma el valor
// "YYYY-MM-DDTHH:MM" (hora del Centro de México) para precargar un
// <input type="datetime-local">, sin depender de la zona horaria del dispositivo.
export function formatMexicoCityDateTimeInput(epochMs: number): string {
  const wallClock = new Date(epochMs - MEXICO_CITY_UTC_OFFSET_MINUTES * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${wallClock.getUTCFullYear()}-${pad(wallClock.getUTCMonth() + 1)}-${pad(wallClock.getUTCDate())}T${pad(wallClock.getUTCHours())}:${pad(wallClock.getUTCMinutes())}`;
}
