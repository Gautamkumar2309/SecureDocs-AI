export function validateName(name) {
  if (!name.trim()) {
    return "Full name is required"
  }

  if (name.trim().length < 3) {
    return "Name must be at least 3 characters"
  }

  return ""
}

export function validateEmail(email) {
  if (!email.trim()) {
    return "Email is required"
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailPattern.test(email)) {
    return "Please enter a valid email address"
  }

  return ""
}

export function validatePassword(password) {
  if (!password) {
    return "Password is required"
  }

  if (password.length < 8) {
    return "Password must be at least 8 characters"
  }

  return ""
}

export function validateConfirmPassword(password, confirmPassword) {
  if (!confirmPassword) {
    return "Please confirm your password"
  }

  if (password !== confirmPassword) {
    return "Passwords do not match"
  }

  return ""
}