const USERNAME_PATTERN = /^[\p{L}]+(?: [\p{L}]+)*$/u

export function normalizeUsername(username: string): string {
  return username.trim().replace(/\s+/g, ' ')
}

export function isValidUsername(username: string): boolean {
  return USERNAME_PATTERN.test(username)
}

