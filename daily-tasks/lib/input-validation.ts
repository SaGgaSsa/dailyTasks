export function parseIntegerInput(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null
  }

  if (typeof value !== 'string') {
    return null
  }

  const trimmed = value.trim()
  if (!/^-?\d+$/.test(trimmed)) {
    return null
  }

  const parsed = Number(trimmed)
  return Number.isInteger(parsed) ? parsed : null
}

export function parsePositiveIntegerInput(value: unknown): number | null {
  const parsed = parseIntegerInput(value)
  return parsed !== null && parsed > 0 ? parsed : null
}
