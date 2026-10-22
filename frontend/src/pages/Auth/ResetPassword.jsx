import { useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"

import AuthLayout from "../../components/common/AuthLayout"
import AuthCard from "../../components/common/AuthCard"
import AuthHeader from "../../components/common/AuthHeader"
import Input from "../../components/common/Input"
import Button from "../../components/common/Button"
import AuthFooter from "../../components/common/AuthFooter"
import PasswordStrength from "../../components/common/PasswordStrength"
import AuthMessage from "../../components/common/AuthMessage"

import { resetPassword } from "../../services/authService"

import {
  validatePassword,
  validateConfirmPassword,
} from "../../utils/authValidation"

import "./Auth.css"

function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess(false)

    if (!token) {
      setError(
        "Password reset token is missing. Please open the reset link again."
      )
      return
    }

    const passwordError = validatePassword(password)
    if (passwordError) {
      setError(passwordError)
      return
    }

    const confirmPasswordError = validateConfirmPassword(
      password,
      confirmPassword
    )
    if (confirmPasswordError) {
      setError(confirmPasswordError)
      return
    }

    setLoading(true)

    try {
      await resetPassword(token, password)

      setSuccess(true)
      setPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(
        err.message || "Unable to reset password. Please request a new link."
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-layout">
        <section className="auth-brand-section">
          <div className="brand-logo">
            <div className="brand-logo-icon">S</div>
            <span>SecureDocs AI</span>
          </div>

          <div className="brand-content">
            <h2>
              Create a stronger
              <br />
              <span>digital identity.</span>
            </h2>

            <p>
              Choose a strong password to keep your SecureDocs AI
              workspace and organizational documents protected.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                Strong password protection
              </div>

              <div className="feature-item">
                <div className="feature-icon">◆</div>
                Secure authentication
              </div>

              <div className="feature-item">
                <div className="feature-icon">✦</div>
                Protected workspace access
              </div>
            </div>
          </div>
        </section>

        <AuthCard>
          <AuthHeader
            title="Reset password"
            subtitle="Create a new password for your account"
          />

          {!token && (
            <AuthMessage type="error">
              The reset token is missing. Please use a valid password reset link.
            </AuthMessage>
          )}

          {error && (
            <AuthMessage type="error">
              {error}
            </AuthMessage>
          )}

          {success && (
            <AuthMessage type="success">
              Your password has been updated successfully. You can now sign in.
            </AuthMessage>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="New password"
              name="password"
              type="password"
              placeholder="Enter your new password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <PasswordStrength password={password} />

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your new password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />

            <Button type="submit" disabled={loading || !token}>
              {loading ? "Updating password..." : "Update Password"}
            </Button>
          </form>

          {success && (
            <Button
              type="button"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
          )}

          <AuthFooter>
            <p>
              Remember your password?{" "}
              <Link to="/login">Back to login</Link>
            </p>
          </AuthFooter>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}

export default ResetPassword