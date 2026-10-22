
import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
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
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
    marginBottom: "28px",
  },
  title: {
    margin: 0,
    fontSize: "30px",
  },
  panel: {
    marginBottom: "24px",
    padding: "24px",
    border: "1px solid #e2e8f0",
    borderRadius: "14px",
    background: "#ffffff",
    boxShadow: "0 5px 18px rgba(20,30,60,0.04)",
  },
  heading: {
    marginTop: 0,
    marginBottom: "18px",
    fontSize: "21px",
  },
  button: {
    padding: "11px 16px",
    border: "none",
    borderRadius: "8px",
    background: "#4338ca",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  deleteButton: {
    padding: "9px 12px",
    border: "none",
    borderRadius: "7px",
    background: "#dc2626",
    color: "#ffffff",
    fontWeight: 600,
    cursor: "pointer",
  },
  form: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "14px",
  },
  input: {
    maxWidth: "100%",
    padding: "10px 0",
  },
  hint: {
    marginTop: "14px",
    color: "#667085",
    fontSize: "13px",
  },
  error: {
    padding: "12px 16px",
    marginBottom: "20px",
    border: "1px solid #fecaca",
    borderRadius: "8px",
    background: "#fef2f2",
    color: "#b91c1c",
  },
  success: {
    padding: "12px 16px",
    marginBottom: "20px",
    border: "1px solid #bbf7d0",
    borderRadius: "8px",
    background: "#f0fdf4",
    color: "#166534",
  },
  list: {
    display: "grid",
    gap: "12px",
  },
  item: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: "16px",
    padding: "16px",
    border: "1px solid #e5e9f2",
    borderRadius: "10px",
  },
  filename: {
    margin: "0 0 8px",
    overflowWrap: "anywhere",
  },
  details: {
    margin: 0,
    color: "#667085",
    fontSize: "14px",
  },
  actions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: "12px",
  },
}

function Documents() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)

  const loadDocuments = useCallback(async () => {
    setLoading(true)
    setError("")

    try {
      const data = await apiRequest("/documents/")
      setDocuments(data?.documents || [])
    } catch (err) {
      setError(err.message || "Unable to load documents.")

      if (
        !localStorage.getItem("access_token") ||
        err.message?.toLowerCase().includes("token") ||
        err.message?.toLowerCase().includes("not authenticated")
      ) {
        localStorage.removeItem("access_token")
        localStorage.removeItem("refresh_token")
        localStorage.removeItem("user")
        navigate("/login", { replace: true })
      }
    } finally {
      setLoading(false)
    }
  }, [navigate])

  useEffect(() => {
    loadDocuments()
  }, [loadDocuments])

  async function handleUpload(event) {
    event.preventDefault()
    setError("")
    setSuccess("")

    if (!selectedFile) {
      setError("Please select a file first.")
      return
    }

    const allowedExtensions = [".pdf", ".docx", ".txt"]
    const filename = selectedFile.name.toLowerCase()

    if (!allowedExtensions.some((ext) => filename.endsWith(ext))) {
      setError("Only PDF, DOCX and TXT files are supported.")
      return
    }

    if (selectedFile.size > 10 * 1024 * 1024) {
      setError("File size must not exceed 10 MB.")
      return
    }

    const formData = new FormData()
    formData.append("file", selectedFile)

    setUploading(true)

    try {
      const result = await apiRequest("/documents/upload", {
        method: "POST",
        body: formData,
      })

      setSelectedFile(null)

      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }

      setSuccess(
        result?.message || "Document uploaded successfully."
      )

      await loadDocuments()
    } catch (err) {
      setError(err.message || "Document upload failed.")
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(documentId, filename) {
    const confirmed = window.confirm(
      `Are you sure you want to permanently delete "${filename}"?`
    )

    if (!confirmed) {
      return
    }

    setError("")
    setSuccess("")
    setDeletingId(documentId)

    try {
      const result = await apiRequest(`/documents/${documentId}`, {
        method: "DELETE",
      })

      setDocuments((previousDocuments) =>
        previousDocuments.filter(
          (document) => document.document_id !== documentId
        )
      )

      setSuccess(
        result?.message || "Document deleted successfully."
      )
    } catch (err) {
      setError(err.message || "Unable to delete document.")
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <h1 style={styles.title}>My Documents</h1>

        <button
          type="button"
          style={styles.button}
          onClick={() => navigate("/dashboard")}
        >
          Back to Dashboard
        </button>
      </header>

      <section style={styles.panel}>
        <h2 style={styles.heading}>Upload a document</h2>

        <form style={styles.form} onSubmit={handleUpload}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.txt"
            style={styles.input}
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] || null)
              setError("")
              setSuccess("")
            }}
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: uploading ? 0.65 : 1,
              cursor: uploading ? "not-allowed" : "pointer",
            }}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </form>

        <p style={styles.hint}>
          Supported formats: PDF, DOCX and TXT. Maximum size: 10 MB.
        </p>
      </section>

      {error && (
        <p style={styles.error} role="alert">
          {error}
        </p>
      )}

      {success && (
        <p style={styles.success} role="status">
          {success}
        </p>
      )}

      <section style={styles.panel}>
        <h2 style={styles.heading}>Uploaded documents</h2>

        {loading ? (
          <p>Loading documents...</p>
        ) : documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <div style={styles.list}>
            {documents.map((document) => (
              <article
                style={styles.item}
                key={document.document_id}
              >
                <div style={{ flex: "1 1 200px", minWidth: 0 }}>
                  <h3 style={styles.filename}>
                    {document.original_filename}
                  </h3>

                  <p style={styles.details}>
                    Type: {document.file_type} · Status: {document.status}
                  </p>

                  <p style={{ ...styles.details, marginTop: "6px" }}>
                    Size:{" "}
                    {Math.round((document.file_size || 0) / 1024)} KB
                  </p>
                </div>

                <div style={styles.actions}>
                  <button
                    type="button"
                    style={{
                      ...styles.deleteButton,
                      opacity:
                        deletingId === document.document_id ? 0.6 : 1,
                      cursor:
                        deletingId === document.document_id
                          ? "not-allowed"
                          : "pointer",
                    }}
                    onClick={() =>
                      handleDelete(
                        document.document_id,
                        document.original_filename
                      )
                    }
                    disabled={deletingId !== null}
                  >
                    {deletingId === document.document_id
                      ? "Deleting..."
                      : "Delete"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}

export default Documents
