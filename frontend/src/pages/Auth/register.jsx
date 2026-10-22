
import { useState } from "react"
import { Link } from "react-router-dom"

import AuthLayout from "../../components/common/AuthLayout"
import AuthCard from "../../components/common/AuthCard"
import AuthHeader from "../../components/common/AuthHeader"
import Input from "../../components/common/Input"
import Button from "../../components/common/Button"
import AuthFooter from "../../components/common/AuthFooter"
import PasswordStrength from "../../components/common/PasswordStrength"
import AuthMessage from "../../components/common/AuthMessage"

import { registerUser } from "../../services/authService"

import {
  validateName,
  validateEmail,
  validatePassword,
  validateConfirmPassword,
} from "../../utils/authValidation"

import "./Auth.css"

function Register() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()

    setError("")
    setSuccess("")

    const nameError = validateName(name)
    if (nameError) {
      setError(nameError)
      return
    }

    const emailError = validateEmail(email)
    if (emailError) {
      setError(emailError)
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
      await registerUser(name.trim(), email.trim(), password)

      setSuccess(
        "Your account has been created. Please check your email and click the verification link before signing in. If you don't receive the email, open the Verify Email page to request another one."
      )

      setName("")
      setEmail("")
      setPassword("")
      setConfirmPassword("")
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.")
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
              Work smarter.
              <br />
              <span>Stay secure.</span>
            </h2>

            <p>
              Create your secure workspace and turn your
              organization's knowledge into intelligent,
              searchable information.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                Secure document management
              </div>

              <div className="feature-item">
                <div className="feature-icon">✦</div>
                AI-powered knowledge assistant
              </div>

              <div className="feature-item">
                <div className="feature-icon">⌕</div>
                Ask questions from your documents
              </div>

              <div className="feature-item">
                <div className="feature-icon">◆</div>
                Enterprise-ready access control
              </div>
            </div>
          </div>
        </section>

        <AuthCard>
          <AuthHeader
            title="Create your account"
            subtitle="Start building your secure knowledge workspace"
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
              label="Full name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />

            <Input
              label="Email address"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Create a strong password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <PasswordStrength password={password} />

            <Input
              label="Confirm password"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(event.target.value)
              }
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>

          <AuthFooter>
            <p>
              Already have an account?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </AuthFooter>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}

export default Register
