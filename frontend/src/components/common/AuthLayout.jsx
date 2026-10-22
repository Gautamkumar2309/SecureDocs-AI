function AuthLayout({ children }) {
  return (
    <div className="auth-page">
      <div className="auth-background">
        <div className="glow glow-one"></div>
        <div className="glow glow-two"></div>
      </div>

      <div className="auth-container">
        {children}
      </div>
    </div>
  )
}

export default AuthLayout