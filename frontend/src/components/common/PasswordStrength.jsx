function PasswordStrength({ password }) {
  if (!password) {
    return null
  }

  let strength = "Weak"

  if (password.length >= 8) {
    strength = "Medium"
  }

  if (
    password.length >= 8 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  ) {
    strength = "Strong"
  }

  return (
    <div className={`password-strength ${strength.toLowerCase()}`}>
      Password strength: <strong>{strength}</strong>
    </div>
  )
}

export default PasswordStrength