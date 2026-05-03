import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Scissors, Bell, User, LogOut, LayoutDashboard, Settings, Calendar } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMenu, setShowMenu] = useState(false);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-sm border-b border-dark-600">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 bg-gold-500 rounded-lg flex items-center justify-center group-hover:bg-gold-400 transition-colors">
            <Scissors className="w-4 h-4 text-black" />
          </div>
          <span className="font-display font-bold text-white text-lg hidden sm:block">
            Barber<span className="text-gold-400">Connect</span>
          </span>
        </Link>

        {/* Links centrales según rol */}
        {user.role === 'client' && (
          <div className="flex items-center gap-1">
            <Link to="/" className={`nav-link px-3 py-1.5 rounded-lg text-sm ${location.pathname === '/' ? 'text-gold-400 bg-dark-700' : ''}`}>
              Inicio
            </Link>
            <Link to="/mis-citas" className={`nav-link px-3 py-1.5 rounded-lg text-sm ${location.pathname === '/mis-citas' ? 'text-gold-400 bg-dark-700' : ''}`}>
              Mis Citas
            </Link>
          </div>
        )}

        {user.role === 'barber' && (
          <Link to="/dashboard" className={`nav-link px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${location.pathname === '/dashboard' ? 'text-gold-400 bg-dark-700' : ''}`}>
            <LayoutDashboard className="w-4 h-4" /> Dashboard
          </Link>
        )}

        {user.role === 'admin' && (
          <Link to="/admin" className={`nav-link px-3 py-1.5 rounded-lg text-sm flex items-center gap-1.5 ${location.pathname === '/admin' ? 'text-gold-400 bg-dark-700' : ''}`}>
            <Settings className="w-4 h-4" /> Panel Admin
          </Link>
        )}

        {/* Derecha: usuario */}
        <div className="flex items-center gap-2 relative">
          <div className="flex items-center gap-2">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt={user.name} className="w-8 h-8 rounded-full object-cover border border-dark-400" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-dark-600 flex items-center justify-center border border-dark-400">
                <User className="w-4 h-4 text-gray-400" />
              </div>
            )}
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="text-sm text-gray-300 hover:text-white transition-colors hidden sm:block max-w-[120px] truncate"
            >
              {user.name}
            </button>
          </div>

          {showMenu && (
            <div className="absolute right-0 top-10 w-48 bg-dark-700 border border-dark-500 rounded-xl shadow-2xl py-1 animate-fade-in">
              <div className="px-4 py-2 border-b border-dark-500">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
                <span className="badge-gold mt-1">{user.role === 'admin' ? 'Admin' : user.role === 'barber' ? 'Barbero' : 'Cliente'}</span>
              </div>
              <button
                onClick={() => { handleLogout(); setShowMenu(false); }}
                className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-dark-600 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
