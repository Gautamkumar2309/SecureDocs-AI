function AuthHeader({ title, subtitle }) {
  return (
    <div className="auth-header">
      <div className="brand-icon">
        S
      </div>

      <h1>{title}</h1>

      <p>{subtitle}</p>
    </div>
  )
}

export default AuthHeader