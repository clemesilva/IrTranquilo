import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sonner'
import { AuthProvider } from './context/AuthProvider'
import { PlacesProvider } from './context/PlacesProvider'
import { useAuth } from './context/useAuth'
import { LoginPage } from './pages/LoginPage'
import { LandingPage } from './pages/LandingPage'
import { ExplorePage } from './pages/ExplorePage'
import { SidebarAddPlace } from './pages/SidebarAddPlace'
import { PlaceDetailPage } from './pages/PlaceDetailPage'

function AppRoutes() {
  const { user, isLoading } = useAuth()

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
          user ? (
            <PlacesProvider>
              <LandingPage />
            </PlacesProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route
        path="/explore"
        element={
          user ? (
            <PlacesProvider>
              <ExplorePage />
            </PlacesProvider>
          ) : (
            <Navigate to="/login" replace />
          )
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
          user ? (
            <PlacesProvider>
              <PlaceDetailPage />
            </PlacesProvider>
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
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
