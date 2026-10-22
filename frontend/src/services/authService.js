import apiRequest from "./api"

// LOGIN
export async function loginUser(email, password) {
  return apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  })
}

// REGISTER
export async function registerUser(name, email, password) {
  return apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password }),
  })
}

// FORGOT PASSWORD
export async function forgotPassword(email) {
  return apiRequest("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}

// RESET PASSWORD
export async function resetPassword(token, newPassword) {
  return apiRequest("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({
      token,
      new_password: newPassword,
    }),
  })
}

// REFRESH ACCESS TOKEN
export async function refreshAccessToken(refresh_token) {
  return apiRequest("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  })
}

// LOGOUT
export async function logoutUser(refresh_token) {
  return apiRequest("/auth/logout", {
    method: "POST",
    body: JSON.stringify({ refresh_token }),
  })
}

// VERIFY EMAIL
export async function verifyEmail(token) {
  return apiRequest(
    `/auth/verify-email?token=${encodeURIComponent(token)}`,
    {
      method: "GET",
    }
  )
}

// RESEND VERIFICATION EMAIL
export async function resendVerificationEmail(email) {
  return apiRequest("/auth/resend-verification", {
    method: "POST",
    body: JSON.stringify({ email }),
  })
}