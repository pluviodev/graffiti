// Konstant-Zeit-freie, aber ausreichende Prüfung: nicht-leer und exakt gleich.
export function isCodeValid(provided: string, expected: string): boolean {
  if (!expected) return false;      // Server ohne Secret akzeptiert nichts
  if (!provided) return false;
  return provided === expected;
}
