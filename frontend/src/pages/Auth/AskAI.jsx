
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import ReactMarkdown from "react-markdown"
import apiRequest from "../../services/api"

const styles = {
  page: {
    minHeight: "100vh",
    padding: "32px 6%",
    background: "#f5f7fb",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
    boxSizing: "border-box",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "28px",
  },
  title: {
    margin: "0 0 8px",
    fontSize: "30px",
  },
  subtitle: {
    margin: 0,
    color: "#667085",
    lineHeight: 1.6,
  },
  button: {
    padding: "11px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#4338ca",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  panel: {
    padding: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#fff",
    marginBottom: "24px",
    boxShadow: "0 5px 18px rgba(20,30,60,0.04)",
    minWidth: 0,
  },
  panelTitle: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "24px",
    lineHeight: 1.3,
  },
  textarea: {
    width: "100%",
    minHeight: "130px",
    padding: "14px",
    border: "1px solid #d8deea",
    borderRadius: "10px",
    fontSize: "16px",
    lineHeight: 1.5,
    boxSizing: "border-box",
    resize: "vertical",
    fontFamily: "inherit",
    outlineColor: "#4338ca",
  },
  error: {
    padding: "12px 16px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
    marginBottom: "20px",
    overflowWrap: "anywhere",
  },
  answer: {
    lineHeight: 1.8,
    overflowWrap: "anywhere",
    color: "#26334d",
    fontSize: "16px",
  },
  answerParagraph: {
    margin: "0 0 16px",
  },
  answerHeading: {
    color: "#172033",
    marginTop: "24px",
    marginBottom: "12px",
    lineHeight: 1.4,
  },
  answerList: {
    paddingLeft: "26px",
    marginTop: "10px",
    marginBottom: "18px",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    margin: "18px 0",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    textAlign: "left",
    fontSize: "14px",
  },
  tableHeader: {
    padding: "12px",
    border: "1px solid #dbe2ea",
    background: "#f1f5f9",
    fontWeight: 700,
    verticalAlign: "top",
  },
  tableCell: {
    padding: "12px",
    border: "1px solid #dbe2ea",
    verticalAlign: "top",
  },
  inlineCode: {
    padding: "2px 5px",
    borderRadius: "4px",
    background: "#f1f5f9",
    fontFamily: "monospace",
  },
  sourceList: {
    paddingLeft: "22px",
    lineHeight: 1.8,
    overflowWrap: "anywhere",
  },
  sourceItem: {
    marginBottom: "6px",
  },
  muted: {
    color: "#667085",
    fontSize: "14px",
  },
}

function AskAI() {
  const navigate = useNavigate()

  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleAsk(event) {
    event.preventDefault()
    setError("")
    setAnswer(null)

    const trimmedQuestion = question.trim()

    if (!trimmedQuestion) {
      setError("Please enter a question.")
      return
    }

    if (trimmedQuestion.length > 1000) {
      setError("Your question must not exceed 1000 characters.")
      return
    }

    setLoading(true)

    try {
      const data = await apiRequest("/documents/ask", {
        method: "POST",
        body: JSON.stringify({
          question: trimmedQuestion,
        }),
      })

      if (!data || typeof data !== "object") {
        throw new Error("The server returned an unexpected response.")
      }

      setAnswer({
        ...data,
        answer:
          typeof data.answer === "string"
            ? data.answer
            : "No answer was returned.",
        sources: Array.isArray(data.sources) ? data.sources : [],
      })
    } catch (err) {
      setError(err.message || "Unable to get an answer.")

      const message = err.message?.toLowerCase() || ""

      if (
        message.includes("invalid or expired token") ||
        message.includes("token has expired") ||
        message.includes("not authenticated")
      ) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        navigate("/login", { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.title}>Ask AI</h1>
          <p style={styles.subtitle}>
            Get answers grounded in your uploaded documents.
          </p>
        </div>

        <button
          type="button"
          style={styles.button}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>
          Ask a question about your documents
        </h2>

        <form onSubmit={handleAsk}>
          <textarea
            style={styles.textarea}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Example: What skills are mentioned in my resume?"
            maxLength={1000}
            required
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              marginTop: "16px",
              opacity: loading ? 0.65 : 1,
              cursor: loading ? "not-allowed" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Finding answer..." : "Ask Question"}
          </button>
        </form>
      </section>

      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {answer && (
        <section style={styles.panel}>
          <h2 style={styles.panelTitle}>Answer</h2>

          <div style={styles.answer}>
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h2 style={styles.answerHeading}>{children}</h2>
                ),
                h2: ({ children }) => (
                  <h3 style={styles.answerHeading}>{children}</h3>
                ),
                h3: ({ children }) => (
                  <h4 style={styles.answerHeading}>{children}</h4>
                ),
                p: ({ children }) => (
                  <p style={styles.answerParagraph}>{children}</p>
                ),
                ul: ({ children }) => (
                  <ul style={styles.answerList}>{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol style={styles.answerList}>{children}</ol>
                ),
                table: ({ children }) => (
                  <div style={styles.tableWrapper}>
                    <table style={styles.table}>{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead>{children}</thead>,
                tbody: ({ children }) => <tbody>{children}</tbody>,
                th: ({ children }) => (
                  <th style={styles.tableHeader}>{children}</th>
                ),
                td: ({ children }) => (
                  <td style={styles.tableCell}>{children}</td>
                ),
                code: ({ children }) => (
                  <code style={styles.inlineCode}>{children}</code>
                ),
                a: ({ children, href }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "#4338ca" }}
                  >
                    {children}
                  </a>
                ),
              }}
            >
              {answer.answer}
            </ReactMarkdown>
          </div>

          {answer.sources.length > 0 ? (
            <div style={{ marginTop: "28px" }}>
              <h3 style={styles.answerHeading}>Sources</h3>

              <ul style={styles.sourceList}>
                {answer.sources.map((source, index) => (
                  <li
                    key={
                      source.chunk_id ??
                      `${source.document_name || "document"}-${source.chunk_index ?? "chunk"}-${index}`
                    }
                    style={styles.sourceItem}
                  >
                    <strong>
                      {source.document_name || "Document"}
                    </strong>

                    {source.chunk_index != null
                      ? ` — Chunk ${source.chunk_index}`
                      : ""}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p style={styles.muted}>
              No source references were returned for this answer.
            </p>
          )}
        </section>
      )}
    </main>
  )
}

export default AskAI
