
import "./App.css"
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Outlet,
} from "react-router-dom"

import Login from "./pages/Auth/Login"
import Register from "./pages/Auth/register"
import ForgetPassword from "./pages/Auth/ForgetPassword"
import ResetPassword from "./pages/Auth/ResetPassword"
import VerifyEmail from "./pages/Auth/VerifyEmail"
import Dashboard from "./pages/Auth/Dashboard"
import Documents from "./pages/Auth/Documents"
import AskAI from "./pages/Auth/AskAI"

// Protect pages that require login
function ProtectedRoute() {
  const accessToken = localStorage.getItem("access_token")

  if (!accessToken) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />

        <Route
          path="/forgetPassword"
          element={<ForgetPassword />}
        />

        <Route
          path="/ResetPassword"
          element={<ResetPassword />}
        />

        <Route
          path="/VerifyEmail"
          element={<VerifyEmail />}
        />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<Dashboard />} />

          <Route path="/documents" element={<Documents />} />

          <Route path="/ask-ai" element={<AskAI />} />
        </Route>

        <Route
          path="/"
          element={<Navigate to="/login" replace />}
        />

        <Route
          path="*"
          element={<Navigate to="/login" replace />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
