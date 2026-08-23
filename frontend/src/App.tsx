import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'

import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Form from './pages/Form'
import Layout from './components/Layout'
import TicketDetail from './pages/TicketDetail'
import AdminDashboard from './pages/AdminDashboard'
import CommunityBoard from './pages/CommunityBoard'

export default function App() {
  const { initialize, isLoading, user, dbUser } = useAuthStore()

  useEffect(() => {
    initialize()
    
    // Ping backend to keep Render instance awake
    const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
    const pingBackend = async () => {
      try {
        await fetch(`${API_BASE}/api/ping`)
      } catch (e) {
        // Ignore errors, we just want to wake it up
      }
    }
    
    pingBackend() // Initial ping
    const interval = setInterval(pingBackend, 60 * 1000) // Ping every 60 seconds
    
    return () => clearInterval(interval)
  }, [initialize])

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>
  }

  const isAdmin = dbUser?.role === 'ADMIN'

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
        <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
        <Route 
          path="/" 
          element={user ? <Layout>{isAdmin ? <AdminDashboard /> : <Dashboard />}</Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin" 
          element={user && isAdmin ? <Layout><AdminDashboard /></Layout> : <Navigate to="/" />} 
        />
        <Route 
          path="/tickets" 
          element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/tickets/:id" 
          element={user ? <Layout><TicketDetail /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin/tickets" 
          element={user && isAdmin ? <Layout><AdminDashboard /></Layout> : <Navigate to="/" />} 
        />
        <Route 
          path="/submit-ticket" 
          element={user ? <Layout><Form /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/community" 
          element={user ? <Layout><CommunityBoard /></Layout> : <Navigate to="/login" />} 
        />
        <Route 
          path="/admin/community" 
          element={user && isAdmin ? <Layout><CommunityBoard /></Layout> : <Navigate to="/" />} 
        />
      </Routes>
    </BrowserRouter>
  )
}
