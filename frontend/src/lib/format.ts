export function fmtNum(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—'
  return n.toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: digits })
}

export function fmtPct(n: number): string {
  return `${fmtNum(n * 100, 1)}%`
}

export function fmtTemp(c: number): string {
  return `${fmtNum(c, 1)}°C`
}

export function fmtArea(km2: number): string {
  return `${fmtNum(km2, 2)} km²`
}

export function fmtCurrencyCr(crore: number): string {
  return `₹${fmtNum(crore, 2)} Cr`
}

export function fmtTs(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  } catch {
    return iso
  }
}
