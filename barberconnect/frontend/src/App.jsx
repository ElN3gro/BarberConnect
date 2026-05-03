import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import BarberProfilePage from './pages/BarberProfilePage';
import BarberDashboard from './pages/BarberDashboard';
import AdminPanel from './pages/AdminPanel';
import ClientAppointments from './pages/ClientAppointments';

// Components
import Navbar from './components/shared/Navbar';

function ProtectedRoute({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <RegisterPage />} />

        <Route path="/" element={
          <ProtectedRoute>
            {user?.role === 'admin' ? <Navigate to="/admin" /> :
             user?.role === 'barber' ? <Navigate to="/dashboard" /> :
             <HomePage />}
          </ProtectedRoute>
        } />

        <Route path="/barber/:barberId" element={
          <ProtectedRoute>
            <BarberProfilePage />
          </ProtectedRoute>
        } />

        <Route path="/mis-citas" element={
          <ProtectedRoute roles={['client']}>
            <ClientAppointments />
          </ProtectedRoute>
        } />

        <Route path="/dashboard" element={
          <ProtectedRoute roles={['barber']}>
            <BarberDashboard />
          </ProtectedRoute>
        } />

        <Route path="/admin" element={
          <ProtectedRoute roles={['admin']}>
            <AdminPanel />
          </ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1a1a1a',
              color: '#f1f5f9',
              border: '1px solid #333',
              borderRadius: '10px',
            },
            success: { iconTheme: { primary: '#f59e0b', secondary: '#000' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
