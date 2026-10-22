function AuthMessage({ type = "error", children }) {
  if (!children) {
    return null
  }

  return (
    <div className={`auth-message ${type}`}>
      {children}
    </div>
  )
}

export default AuthMessage
