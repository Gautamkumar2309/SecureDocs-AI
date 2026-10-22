const API_BASE_URL = `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api`;

async function apiRequest(endpoint, options = {}) {
  try {
    const token = localStorage.getItem("access_token")
    const isFormData =
      typeof FormData !== "undefined" && options.body instanceof FormData

    const headers = {
      ...(isFormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const contentType = response.headers.get("content-type") || ""
    let data = null

    if (response.status !== 204) {
      if (contentType.includes("application/json")) {
        data = await response.json()
      } else {
        const text = await response.text()
        data = text || null
      }
    }

    if (!response.ok) {
      const detail =
        typeof data === "object" && data !== null
          ? data.detail
          : data

      let message = "Request failed"

      if (typeof detail === "string") {
        message = detail
      } else if (Array.isArray(detail)) {
        message = detail
          .map((item) => {
            if (typeof item === "string") {
              return item
            }

            if (item && typeof item === "object") {
              const field = Array.isArray(item.loc)
                ? item.loc.filter((part) => part !== "body").join(".")
                : ""

              const description = item.msg || JSON.stringify(item)

              return field
                ? `${field}: ${description}`
                : description
            }

            return String(item)
          })
          .join(", ")
      } else if (detail && typeof detail === "object") {
        message = detail.msg || JSON.stringify(detail)
      } else if (detail !== undefined && detail !== null) {
        message = String(detail)
      } else {
        message = `Request failed with status ${response.status}`
      }

      throw new Error(message)
    }

    return data
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        "Unable to connect to the server. Please make sure the backend is running."
      )
    }

    throw error
  }
}

export default apiRequest