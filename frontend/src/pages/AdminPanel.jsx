import { useState, useEffect } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';
import { Users, Calendar, CheckCircle, XCircle, BarChart2, Phone, Clock } from 'lucide-react';

export default function AdminPanel() {
  const [tab, setTab] = useState('pending');
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pendingRes, usersRes, apptRes, statsRes] = await Promise.all([
        api.get('/admin/barbers/pending'),
        api.get('/admin/users'),
        api.get('/admin/appointments'),
        api.get('/admin/stats'),
      ]);
      setPending(pendingRes.data);
      setUsers(usersRes.data);
      setAppointments(apptRes.data);
      setStats(statsRes.data);
    } catch (err) {
      toast.error('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (profileId, action) => {
    const rejection_reason = action === 'reject'
      ? prompt('Razón del rechazo (opcional):') || ''
      : '';
    try {
      await api.patch(`/admin/barbers/${profileId}/approve`, { action, rejection_reason });
      toast.success(action === 'approve' ? '✅ Barbero aprobado y notificado por WhatsApp' : '❌ Barbero rechazado');
      loadData();
    } catch (err) {
      toast.error('Error al procesar');
    }
  };

  const toggleUser = async (userId) => {
    try {
      await api.patch(`/admin/users/${userId}/toggle`);
      toast.success('Estado actualizado');
      loadData();
    } catch (err) {
      toast.error('Error');
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 pt-20 pb-10">
      {/* Header */}
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-white">Panel de Administración</h1>
        <p className="text-gray-500 text-sm">BarberConnect · Control total</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-gold-400">{stats.total_clients}</div>
            <div className="text-xs text-gray-500 mt-0.5">Clientes</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-gold-400">{stats.total_barbers}</div>
            <div className="text-xs text-gray-500 mt-0.5">Barberos activos</div>
          </div>
          <div className="stat-card text-center">
            <div className="text-2xl font-bold text-gold-400">{stats.total_appointments}</div>
            <div className="text-xs text-gray-500 mt-0.5">Citas totales</div>
          </div>
          <div className="stat-card text-center border-yellow-500/30">
            <div className="text-2xl font-bold text-yellow-400">{stats.pending_barbers}</div>
            <div className="text-xs text-gray-500 mt-0.5">Pendientes</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="grid grid-cols-4 gap-1 mb-6 bg-dark-800 p-1 rounded-xl border border-dark-600">
        {[
          { key: 'pending', label: `⏳ Pendientes (${pending.length})` },
          { key: 'users', label: '👥 Usuarios' },
          { key: 'appointments', label: '📅 Citas' },
          { key: 'stats', label: '📊 Stats' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`py-2.5 text-xs font-medium rounded-lg transition-all ${tab === t.key ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* PENDIENTES */}
      {tab === 'pending' && (
        <div className="space-y-3 animate-fade-in">
          {pending.length === 0 ? (
            <div className="text-center py-14 text-gray-500">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p>Sin solicitudes pendientes</p>
            </div>
          ) : pending.map(barber => (
            <div key={barber.profile_id} className="card p-4 border-yellow-500/20">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{barber.name}</h3>
                  <p className="text-sm text-gray-400">{barber.email}</p>
                  {barber.phone && (
                    <a href={`https://wa.me/${barber.phone.replace(/\D/g,'')}`} target="_blank"
                      className="flex items-center gap-1 text-xs text-emerald-400 mt-1 hover:text-emerald-300">
                      <Phone className="w-3 h-3" /> {barber.phone} · Abrir WhatsApp
                    </a>
                  )}
                  {barber.location && <p className="text-xs text-gray-500 mt-0.5">📍 {barber.location}</p>}
                  <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Registrado: {new Date(barber.created_at).toLocaleDateString('es-CR')}
                  </p>
                </div>
                <span className="badge-yellow">Pendiente</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handleApprove(barber.profile_id, 'approve')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors font-medium">
                  <CheckCircle className="w-4 h-4" /> Aprobar y notificar
                </button>
                <button onClick={() => handleApprove(barber.profile_id, 'reject')}
                  className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-400 text-sm py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors border border-red-800">
                  <XCircle className="w-4 h-4" /> Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* USUARIOS */}
      {tab === 'users' && (
        <div className="animate-fade-in">
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-dark-600">
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Nombre</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Rol</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Estado</th>
                    <th className="text-left px-4 py-3 text-gray-500 font-medium">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium text-white">{u.name}</div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.role === 'admin' ? 'badge-gold' : u.role === 'barber' ? 'badge-yellow' : 'text-gray-400 text-xs'}>
                          {u.role === 'admin' ? '👑 Admin' : u.role === 'barber' ? '✂️ Barbero' : '👤 Cliente'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                          {u.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                        {u.barber_status && <div className="text-xs text-gray-500 mt-0.5">{u.barber_status}</div>}
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button onClick={() => toggleUser(u.id)}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                              u.is_active
                                ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50'
                                : 'bg-emerald-900/30 text-emerald-400 hover:bg-emerald-900/50'
                            }`}>
                            {u.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CITAS */}
      {tab === 'appointments' && (
        <div className="animate-fade-in space-y-2">
          {appointments.map(a => (
            <div key={a.id} className="card p-3 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white text-sm">{a.client_name}</span>
                  <span className="text-gray-500 text-xs">→</span>
                  <span className="text-gold-400 text-sm">{a.barber_name}</span>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  📅 {a.appointment_date?.substring(0,10)} · ⏰ {a.appointment_time?.substring(0,5)}
                  {a.service_name && ` · ✂️ ${a.service_name}`}
                </div>
              </div>
              <span className={
                a.status === 'completed' ? 'badge-gold' :
                a.status === 'confirmed' ? 'badge-green' :
                a.status === 'cancelled' ? 'badge-red' : 'badge-yellow'
              }>
                {a.status === 'completed' ? 'Completada' : a.status === 'confirmed' ? 'Confirmada' : a.status === 'cancelled' ? 'Cancelada' : 'Pendiente'}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* STATS */}
      {tab === 'stats' && stats && (
        <div className="animate-fade-in">
          <div className="card p-5">
            <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-gold-400" /> Citas por mes (últimos 6 meses)
            </h3>
            <div className="space-y-2">
              {stats.monthly_appointments?.map((m, i) => {
                const max = Math.max(...stats.monthly_appointments.map(x => parseInt(x.count)));
                const pct = max > 0 ? (parseInt(m.count) / max) * 100 : 0;
                const label = new Date(m.month).toLocaleDateString('es-CR', { month: 'long', year: 'numeric' });
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-28 text-right capitalize">{label}</span>
                    <div className="flex-1 bg-dark-700 rounded-full h-5 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-600 to-gold-400 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-gold-400 w-6">{m.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="stat-card p-5 text-center">
              <Users className="w-6 h-6 text-gold-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.total_clients}</div>
              <div className="text-sm text-gray-500 mt-1">Clientes registrados</div>
            </div>
            <div className="stat-card p-5 text-center">
              <Calendar className="w-6 h-6 text-gold-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.total_appointments}</div>
              <div className="text-sm text-gray-500 mt-1">Citas totales</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
