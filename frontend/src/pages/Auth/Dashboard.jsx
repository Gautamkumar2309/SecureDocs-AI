
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { logoutUser } from "../../services/authService"
import "./Dashboard.css"

function Dashboard() {
  const navigate = useNavigate()
  const [loggingOut, setLoggingOut] = useState(false)

  const storedUser = localStorage.getItem("user")
  let user = null

  try {
    user = storedUser ? JSON.parse(storedUser) : null
  } catch {
    user = null
  }

  async function handleLogout() {
    if (loggingOut) return

    setLoggingOut(true)

    const refreshToken = localStorage.getItem("refresh_token")

    try {
      if (refreshToken) {
        await logoutUser(refreshToken)
      }
    } catch (err) {
      // Local logout will still continue if the server request fails.
      console.error("Server logout failed:", err.message)
    } finally {
      localStorage.removeItem("access_token")
      localStorage.removeItem("refresh_token")
      localStorage.removeItem("user")

      navigate("/login", { replace: true })
    }
  }

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="dashboard-logo">S</div>
          <span>SecureDocs AI</span>
        </div>

        <button
          className="dashboard-logout"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? "Signing Out..." : "Sign Out"}
        </button>
      </header>

      <main className="dashboard-main">
        <section className="dashboard-welcome">
          <p className="dashboard-eyebrow">
            YOUR WORKSPACE
          </p>

          <h1>
            Welcome back{user?.name ? `, ${user.name}` : ""}!
          </h1>

          <p>
            Manage your documents and get AI-powered answers
            from your knowledge workspace.
          </p>
        </section>

        <section className="dashboard-cards">
          <article className="dashboard-card">
            <div className="dashboard-card-icon">📄</div>
            <h2>My Documents</h2>
            <p>
              Upload and manage your PDF, DOCX and TXT files.
            </p>
            <button
              className="dashboard-action"
              onClick={() => navigate("/documents")}
            >
              View Documents
            </button>
          </article>

          <article className="dashboard-card">
            <div className="dashboard-card-icon">✦</div>
            <h2>Ask AI</h2>
            <p>
              Ask questions and get answers based on your documents.
            </p>
            <button
              className="dashboard-action"
              onClick={() => navigate("/ask-ai")}
            >
              Ask a Question
            </button>
          </article>

          <article className="dashboard-card">
            <div className="dashboard-card-icon">🔒</div>
            <h2>Secure Workspace</h2>
            <p>
              Your workspace is designed for private document access.
            </p>
            <span className="dashboard-user-role">
              Role: {user?.role || "User"}
            </span>
          </article>
        </section>

        <footer className="dashboard-footer">
          SecureDocs AI · Document Intelligence Workspace
        </footer>
      </main>
    </div>
  )
}

export default Dashboard
