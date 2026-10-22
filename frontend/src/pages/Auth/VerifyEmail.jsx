
import { useEffect, useRef, useState } from "react"
import { Link, useSearchParams, useNavigate } from "react-router-dom"

import AuthLayout from "../../components/common/AuthLayout"
import AuthCard from "../../components/common/AuthCard"
import AuthHeader from "../../components/common/AuthHeader"
import Input from "../../components/common/Input"
import Button from "../../components/common/Button"
import AuthFooter from "../../components/common/AuthFooter"
import AuthMessage from "../../components/common/AuthMessage"

import {
  verifyEmail,
  resendVerificationEmail,
} from "../../services/authService"

import "./Auth.css"

function VerifyEmail() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get("token")

  const [email, setEmail] = useState("")
  const [loading, setLoading] = useState(Boolean(token))
  const [resending, setResending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState("")
  const [resendMessage, setResendMessage] = useState("")

  const verificationStarted = useRef(false)

  useEffect(() => {
    if (!token || verificationStarted.current) return

    verificationStarted.current = true

    async function verify() {
      setLoading(true)
      setError("")

      try {
        await verifyEmail(token)
        setSuccess(true)
      } catch (err) {
        setError(
          err.message ||
            "Verification failed. The link may be invalid or expired."
        )
      } finally {
        setLoading(false)
      }
    }

    verify()
  }, [token])

  async function handleResend(event) {
    event.preventDefault()

    setError("")
    setResendMessage("")

    if (!email.trim()) {
      setError("Please enter your email address.")
      return
    }

    setResending(true)

    try {
      const response = await resendVerificationEmail(email.trim())

      setResendMessage(
        response?.message ||
          "If the account exists and needs verification, a verification email will be sent."
      )
    } catch (err) {
      setError(
        err.message ||
          "Unable to request a verification email. Please try again later."
      )
    } finally {
      setResending(false)
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
              One final step.
              <br />
              <span>Verify your identity.</span>
            </h2>

            <p>
              Verify your email address to activate your SecureDocs AI
              account and securely access your knowledge workspace.
            </p>

            <div className="feature-list">
              <div className="feature-item">
                <div className="feature-icon">✓</div>
                Verified account access
              </div>

              <div className="feature-item">
                <div className="feature-icon">◆</div>
                Protected documents
              </div>

              <div className="feature-item">
                <div className="feature-icon">✦</div>
                Secure AI workspace
              </div>
            </div>
          </div>
        </section>

        <AuthCard>
          <AuthHeader
            title="Verify your email"
            subtitle="Activate your SecureDocs AI account"
          />

          <div style={{ textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                margin: "0 auto 24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "22px",
                background: "linear-gradient(135deg, #eef2ff, #ecfeff)",
                fontSize: "38px",
              }}
            >
              {loading ? "…" : success ? "✓" : "✉"}
            </div>

            {loading && (
              <p role="status">
                Verifying your email address...
              </p>
            )}

            {success && (
              <AuthMessage type="success">
                Your email has been verified successfully. You can now sign in.
              </AuthMessage>
            )}

            {error && (
              <AuthMessage type="error">
                {error}
              </AuthMessage>
            )}

            {resendMessage && (
              <AuthMessage type="success">
                {resendMessage}
              </AuthMessage>
            )}

            {success ? (
              <Button
                type="button"
                onClick={() => navigate("/login", { replace: true })}
              >
                Go to Login
              </Button>
            ) : (
              <>
                <p
                  style={{
                    color: "#64748b",
                    fontSize: "14px",
                    lineHeight: "1.7",
                    margin: "20px 0",
                  }}
                >
                  Open the verification link sent to your email. If you
                  haven't received it, you can request another email below.
                </p>

                <form onSubmit={handleResend}>
                  <Input
                    label="Email address"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    required
                  />

                  <Button type="submit" disabled={resending}>
                    {resending
                      ? "Sending request..."
                      : "Resend Verification Email"}
                  </Button>
                </form>
              </>
            )}
          </div>

          <AuthFooter>
            <p>
              Already verified?{" "}
              <Link to="/login">Sign in</Link>
            </p>
          </AuthFooter>
        </AuthCard>
      </div>
    </AuthLayout>
  )
}

export default VerifyEmail
