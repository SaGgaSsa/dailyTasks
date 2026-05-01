const DEFAULT_TEMPORARY_USER_PASSWORD = '1234'
const MIN_USER_PASSWORD_LENGTH = 4

export function getTemporaryUserPassword() {
  return process.env.TEMPORARY_USER_PASSWORD ?? DEFAULT_TEMPORARY_USER_PASSWORD
}

export function validateUserPassword(password: string) {
  if (password.length < MIN_USER_PASSWORD_LENGTH) {
    return `Mínimo ${MIN_USER_PASSWORD_LENGTH} caracteres`
  }

  return null
}

export function validateNewUserPassword(password: string) {
  const lengthError = validateUserPassword(password)
  if (lengthError) {
    return lengthError
  }

  if (password === getTemporaryUserPassword()) {
    return 'La nueva contraseña no puede ser la contraseña temporal'
  }

  return null
}
