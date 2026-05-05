import { BrowserRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthProvider'
import { PlacesProvider } from './context/PlacesProvider'
import { useAuth } from './context/useAuth'
import { LoginPage } from './pages/LoginPage'
import { LandingPage } from './pages/LandingPage'
import { SidebarAddPlace } from './pages/SidebarAddPlace'
import { PlaceDetailPage } from './pages/PlaceDetailPage'
import { MarcoLegalPage } from './pages/MarcoLegalPage'
import { useEffect } from 'react'
import { toast } from 'sonner'

function AppRoutes() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()

  // Después de Google OAuth: mostrar toast y redirigir a la ruta donde estaba el usuario
  useEffect(() => {
    if (!user) return
    if (sessionStorage.getItem('showLoginToast') === 'true') {
      sessionStorage.removeItem('showLoginToast')
      toast.success('¡Sesión iniciada!')
    }
    const path = sessionStorage.getItem('postLoginPath')
    if (!path || path === '/' || path === window.location.pathname) {
      sessionStorage.removeItem('postLoginPath')
      return
    }
    sessionStorage.removeItem('postLoginPath')
    navigate(path, { replace: true })
  }, [user, navigate])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <PlacesProvider>
            <LandingPage />
          </PlacesProvider>
        }
      />
      <Route
        path="/places/new"
        element={
          user ? (
            <PlacesProvider>
              <SidebarAddPlace />
            </PlacesProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/lugares/:id"
        element={
          <PlacesProvider>
            <PlaceDetailPage />
          </PlacesProvider>
        }
      />
      <Route path="/marco-legal" element={<MarcoLegalPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster richColors position="top-right" />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
