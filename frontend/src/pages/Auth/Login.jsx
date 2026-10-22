import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"

import AuthLayout from "../../components/common/AuthLayout"
import AuthCard from "../../components/common/AuthCard"
import AuthHeader from "../../components/common/AuthHeader"
import Input from "../../components/common/Input"
import Button from "../../components/common/Button"
import AuthFooter from "../../components/common/AuthFooter"
import AuthMessage from "../../components/common/AuthMessage"

import {
  validateEmail,
  validatePassword,
} from "../../utils/authValidation"

import { loginUser } from "../../services/authService"

import "./Auth.css"

function Login() {
  const navigate = useNavigate()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError("")

    // Validate email
    const emailError = validateEmail(email)

    if (emailError) {
      setError(emailError)
      return
    }

    // Validate password
    const passwordError = validatePassword(password)

    if (passwordError) {
      setError(passwordError)
      return
    }

    try {
      setLoading(true)

      const data = await loginUser(email, password)

      // Validate the login response before saving tokens
      if (!data.access_token || !data.refresh_token || !data.user) {
        throw new Error("Invalid login response from server.")
      }

      localStorage.setItem("access_token", data.access_token)
      localStorage.setItem("refresh_token", data.refresh_token)

      localStorage.setItem("user", JSON.stringify(data.user))

      navigate("/dashboard", { replace: true })
    } catch (error) {
      setError(error.message || "Login failed. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="auth-layout">
        {/* LEFT BRANDING SECTION */}
        <section className="auth-brand-section">
          <div className="brand-logo">
            <div className="brand-logo-icon">S</div>
            <span>SecureDocs AI</span>
          </div>

          <div className="brand-content">
            <h2>
              Your documents.
              <br />
              <span>Your intelligence.</span>
            </h2>

            <p>
              SecureDocs AI turns your organization's documents
              into a private, searchable and intelligent knowledge
              workspace.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                Secure document storage
              </div>

              <div className="feature-item">
                <div className="feature-icon">✦</div>
                AI-powered document search
              </div>

              <div className="feature-item">
                <div className="feature-icon">⌕</div>
                Grounded answers with citations
              </div>

              <div className="feature-item">
                <div className="feature-icon">◆</div>
                Role-based access control
              </div>
            </div>
          </div>
        </section>

        {/* LOGIN CARD */}
        <AuthCard>
          <AuthHeader
            title="Welcome back"
            subtitle="Sign in to continue to your workspace"
          />

          {/* ERROR MESSAGE */}
          {error && (
            <AuthMessage type="error">
              {error}
            </AuthMessage>
          )}

          {/* LOGIN FORM */}
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

            <Input
              label="Password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />

            <Button type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          {/* FOOTER LINKS */}
          <AuthFooter>
            <p>
              Don't have an account?{" "}
              <Link to="/register">
                Create account
              </Link>
            </p>

            <p style={{ marginTop: "10px" }}>
              <Link to="/forgetPassword">
                Forgot your password?
              </Link>
            </p>
          </AuthFooter>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}

export default Login