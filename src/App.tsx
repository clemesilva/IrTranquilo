import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { PlacesProvider } from './context/PlacesProvider';
import { useAuth } from './context/useAuth';
import { MainLayout } from './layouts/MainLayout';
import { LoginPage } from './pages/LoginPage';
import { SidebarAddPlace } from './pages/SidebarAddPlace';
import { SidebarHome } from './pages/SidebarHome';
import { SidebarPlaceDetail } from './pages/SidebarPlaceDetail';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to='/login' replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className='flex h-screen items-center justify-center'>
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <Routes>
      <Route path='/login' element={<LoginPage />} />
      <Route
        path='/'
        element={
          user ? (
            <PlacesProvider>
              <MainLayout />
            </PlacesProvider>
          ) : (
            <Navigate to='/login' replace />
          )
        }
      >
        <Route index element={<SidebarHome />} />
        <Route path='places/new' element={<SidebarAddPlace />} />
        <Route path='places/:placeId' element={<SidebarPlaceDetail />} />
      </Route>
      <Route path='*' element={<Navigate to='/' replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
