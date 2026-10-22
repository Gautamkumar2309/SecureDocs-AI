import { useState } from "react"
import { Link } from "react-router-dom"

import AuthLayout from "../../components/common/AuthLayout"
import AuthCard from "../../components/common/AuthCard"
import AuthHeader from "../../components/common/AuthHeader"
import Input from "../../components/common/Input"
import Button from "../../components/common/Button"
import AuthFooter from "../../components/common/AuthFooter"
import AuthMessage from "../../components/common/AuthMessage"

import { forgotPassword } from "../../services/authService"
import { validateEmail } from "../../utils/authValidation"

import "./Auth.css"

function ForgetPassword() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    const normalizedEmail = email.trim()
    const emailError = validateEmail(normalizedEmail)

    if (emailError) {
      setError(emailError)
      return
    }

    setLoading(true)

    try {
      const response = await forgotPassword(normalizedEmail)

      setSuccess(
        response?.message ||
          "If an account exists with this email, a password reset link will be sent."
      )
    } catch (err) {
      setError(
        err.message ||
          "Unable to process your request. Please try again later."
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
              Secure access.
              <br />
              <span>Always protected.</span>
            </h2>

            <p>
              Reset your password securely and get back to
              your private knowledge workspace.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                Secure password recovery
              </div>

              <div className="feature-item">
                <div className="feature-icon">⌕</div>
                Protected account access
              </div>

              <div className="feature-item">
                <div className="feature-icon">◆</div>
                Private workspace
              </div>
            </div>
          </div>
        </section>

        <AuthCard>
          <AuthHeader
            title="Forgot your password?"
            subtitle="Enter your email to request a password reset"
          />

          {error && (
            <AuthMessage type="error">
              {error}
            </AuthMessage>
          )}

          {success && (
            <AuthMessage type="success">
              {success}
            </AuthMessage>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Sending request..." : "Send Reset Link"}
            </Button>
          </form>

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

export default ForgetPassword