import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Scissors, User, Scissors as ScissorsIcon } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'client', phone: '' });
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await register(form);
      if (form.role === 'barber') {
        toast.success('Registro exitoso. Pendiente de aprobación. Te contactaremos por WhatsApp. ✅', { duration: 6000 });
        navigate('/login');
      } else {
        toast.success('¡Registro exitoso!');
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 pt-20">
      <div className="w-full max-w-sm animate-slide-up">

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gold-500 rounded-2xl mb-4">
            <Scissors className="w-7 h-7 text-black" />
          </div>
          <h1 className="font-display text-3xl font-bold text-white">
            Barber<span className="text-gold-400">Connect</span>
          </h1>
        </div>

        {/* Selector de rol */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'client' })}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              form.role === 'client'
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-dark-500 bg-dark-800 text-gray-400 hover:border-dark-400'
            }`}
          >
            <User className="w-6 h-6" />
            <span className="text-sm font-medium">Cliente</span>
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, role: 'barber' })}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
              form.role === 'barber'
                ? 'border-gold-500 bg-gold-500/10 text-gold-400'
                : 'border-dark-500 bg-dark-800 text-gray-400 hover:border-dark-400'
            }`}
          >
            <ScissorsIcon className="w-6 h-6" />
            <span className="text-sm font-medium">Barbero</span>
          </button>
        </div>

        {form.role === 'barber' && (
          <div className="bg-gold-500/10 border border-gold-500/20 rounded-xl p-3 mb-4 text-sm text-gold-400">
            ℹ️ Los barberos requieren aprobación del administrador. Te contactaremos por WhatsApp al número que indiques.
          </div>
        )}

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Nombre completo</label>
              <input type="text" className="input-field" placeholder="Tu nombre"
                value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>

            <div>
              <label className="label">Email</label>
              <input type="email" className="input-field" placeholder="tu@email.com"
                value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>

            <div>
              <label className="label">Contraseña</label>
              <input type="password" className="input-field" placeholder="Mínimo 6 caracteres"
                value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
            </div>

            {form.role === 'barber' && (
              <div>
                <label className="label">Número de WhatsApp <span className="text-gold-500">*</span></label>
                <input type="tel" className="input-field" placeholder="+506 8888-8888"
                  value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required />
                <p className="text-xs text-gray-500 mt-1">El admin te contactará por este número</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-gold-400 hover:text-gold-300 font-medium">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
