import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Calendar, Camera, Clock, Award, Plus, Trash2, Check, X, UploadCloud, Settings } from 'lucide-react';

const DAYS_NAMES = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
const REWARD_TYPES = [
  { value: 'free_haircut', label: '✂️ Corte gratis' },
  { value: 'discount', label: '💰 Descuento %' },
  { value: 'priority', label: '⚡ Prioridad de corte' },
  { value: 'free_eyebrows', label: '👁️ Cejas gratis' },
  { value: 'free_design', label: '🎨 Diseño gratis' },
  { value: 'free_beard', label: '🧔 Barba gratis' },
  { value: 'eyebrow_discount', label: '💰 Descuento en cejas' },
  { value: 'beard_discount', label: '💰 Descuento en barba' },
  { value: 'design_discount', label: '💰 Descuento en diseño' },
];

export default function BarberDashboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('citas');
  const [appointments, setAppointments] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [services, setServices] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Disponibilidad
  const [availability, setAvailability] = useState(
    Array.from({ length: 7 }, (_, i) => ({
      day_of_week: i, enabled: false,
      start_time: '08:00', end_time: '18:00', slot_duration_minutes: 30
    }))
  );

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [apptRes, meRes] = await Promise.all([
        api.get('/appointments/my'),
        api.get('/auth/me'),
      ]);
      setAppointments(apptRes.data);
      setProfile(meRes.data);

      // Cargar más datos
      const [photosRes, loyaltyRes, servicesRes] = await Promise.all([
        api.get(`/barbers/${meRes.data.barber_profile_id}`).then(r => r.data.photos || []),
        api.get('/loyalty/my').then(r => r.data),
        api.get(`/barbers/${meRes.data.barber_profile_id}`).then(r => r.data.services || []),
      ]);
      setPhotos(photosRes);
      setLoyaltyCards(loyaltyRes);
      setServices(servicesRes);

      // Cargar disponibilidad actual
      const availRes = await api.get(`/barbers/${meRes.data.barber_profile_id}`);
      const existingAvail = availRes.data.availability || [];
      setAvailability(prev => prev.map(day => {
        const found = existingAvail.find(a => a.day_of_week === day.day_of_week);
        if (found) return { ...day, enabled: true, start_time: found.start_time.substring(0,5), end_time: found.end_time.substring(0,5), slot_duration_minutes: found.slot_duration_minutes };
        return day;
      }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const today = appointments.filter(a =>
    a.appointment_date?.substring(0, 10) === new Date().toISOString().substring(0, 10)
    && a.status !== 'cancelled'
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 pb-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-12 h-12 rounded-xl bg-dark-600 border border-dark-400 flex items-center justify-center overflow-hidden">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="font-display font-bold text-gold-400 text-lg">{user.name.charAt(0)}</span>
          )}
        </div>
        <div>
          <h1 className="font-display text-xl font-bold text-white">Hola, {user.name.split(' ')[0]}! ✂️</h1>
          <p className="text-sm text-gray-500">{today.length} cita{today.length !== 1 ? 's' : ''} hoy</p>
        </div>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-gold-400">{today.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Hoy</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-gold-400">{appointments.filter(a => a.status === 'pending').length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Pendientes</div>
        </div>
        <div className="stat-card text-center">
          <div className="text-2xl font-bold text-gold-400">{appointments.filter(a => a.status === 'completed').length}</div>
          <div className="text-xs text-gray-500 mt-0.5">Completadas</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-5 gap-1 mb-6 bg-dark-800 p-1 rounded-xl border border-dark-600">
        {[
          { key: 'citas', label: '📅 Citas' },
          { key: 'fotos', label: '📸 Fotos' },
          { key: 'disponibilidad', label: '⏰ Horarios' },
          { key: 'servicios', label: '💈 Servicios' },
          { key: 'fidelidad', label: '⭐ Fidelidad' },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-2 text-xs font-medium rounded-lg transition-all ${
              tab === t.key ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* CITAS */}
      {tab === 'citas' && (
        <AppointmentsTab appointments={appointments} onRefresh={loadData} />
      )}

      {/* FOTOS */}
      {tab === 'fotos' && (
        <PhotosTab photos={photos} onRefresh={loadData} />
      )}

      {/* DISPONIBILIDAD */}
      {tab === 'disponibilidad' && (
        <AvailabilityTab availability={availability} setAvailability={setAvailability} />
      )}

      {/* SERVICIOS */}
      {tab === 'servicios' && (
        <ServicesTab services={services} onRefresh={loadData} />
      )}

      {/* FIDELIDAD */}
      {tab === 'fidelidad' && (
        <LoyaltyTab loyaltyCards={loyaltyCards} onRefresh={loadData} />
      )}
    </div>
  );
}

// ==================== CITAS TAB ====================
function AppointmentsTab({ appointments, onRefresh }) {
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? appointments :
    appointments.filter(a => a.status === filter);

  const updateStatus = async (id, status, comment = '') => {
    try {
      await api.patch(`/appointments/${id}/status`, { status, barber_comment: comment });
      toast.success('Estado actualizado');
      onRefresh();
    } catch (err) {
      toast.error('Error al actualizar');
    }
  };

  const STATUS_COLORS = {
    pending: 'badge-yellow',
    confirmed: 'badge-green',
    cancelled: 'badge-red',
    completed: 'badge-gold',
  };
  const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' };

  return (
    <div className="animate-fade-in">
      <div className="flex gap-1 mb-4 flex-wrap">
        {['all', 'pending', 'confirmed', 'completed', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'bg-gold-500 text-black' : 'bg-dark-700 text-gray-400 hover:text-white'}`}>
            {f === 'all' ? 'Todas' : STATUS_LABELS[f]}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            <Calendar className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>Sin citas</p>
          </div>
        ) : filtered.map(appt => (
          <div key={appt.id} className="card p-4 animate-slide-up">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-medium text-white">{appt.client_name}</h4>
                <p className="text-sm text-gray-400">
                  📅 {appt.appointment_date?.substring(0,10)} · ⏰ {appt.appointment_time?.substring(0,5)}
                </p>
                {appt.service_name && <p className="text-xs text-gray-500 mt-0.5">✂️ {appt.service_name}</p>}
                {appt.is_home_service && <p className="text-xs text-emerald-400 mt-0.5">🏠 A domicilio</p>}
                {appt.notes && <p className="text-xs text-gray-500 italic mt-1">"{appt.notes}"</p>}
              </div>
              <span className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</span>
            </div>

            {appt.status === 'pending' && (
              <div className="flex gap-2 mt-3 pt-3 border-t border-dark-600">
                <button onClick={() => updateStatus(appt.id, 'confirmed')}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-sm py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                  <Check className="w-4 h-4" /> Confirmar
                </button>
                <button onClick={() => {
                  const comment = prompt('Razón de cancelación (opcional):') || '';
                  updateStatus(appt.id, 'cancelled', comment);
                }}
                  className="flex-1 bg-red-900/50 hover:bg-red-800 text-red-400 text-sm py-2 rounded-lg flex items-center justify-center gap-1 transition-colors border border-red-800">
                  <X className="w-4 h-4" /> Cancelar
                </button>
              </div>
            )}

            {appt.status === 'confirmed' && (
              <button onClick={() => updateStatus(appt.id, 'completed')}
                className="w-full mt-3 pt-3 border-t border-dark-600 text-sm text-gold-400 hover:text-gold-300 transition-colors">
                ✅ Marcar como completada
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== FOTOS TAB ====================
function PhotosTab({ photos, onRefresh }) {
  const [imageUrl, setImageUrl] = useState('');
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!imageUrl) return toast.error('Ingresa la URL de la imagen');
    setSaving(true);
    try {
      await api.post('/photos', { image_url: imageUrl, caption });
      toast.success('Foto agregada');
      setImageUrl('');
      setCaption('');
      onRefresh();
    } catch (err) {
      toast.error('Error al agregar foto');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await api.delete(`/photos/${id}`);
      toast.success('Foto eliminada');
      onRefresh();
    } catch (err) {
      toast.error('Error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2"><UploadCloud className="w-4 h-4 text-gold-400" /> Subir foto</h3>
        <p className="text-xs text-gray-500 mb-3">Sube tu imagen a <a href="https://imgbb.com" target="_blank" className="text-gold-400">imgbb.com</a> o <a href="https://imgur.com" target="_blank" className="text-gold-400">imgur.com</a> y pega la URL aquí</p>
        <input className="input-field mb-2" placeholder="https://i.imgur.com/..." value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
        <input className="input-field mb-3" placeholder="Descripción del corte (opcional)" value={caption} onChange={e => setCaption(e.target.value)} />
        {imageUrl && <img src={imageUrl} alt="preview" className="w-full h-32 object-cover rounded-lg mb-3 opacity-70" onError={() => toast.error('URL inválida')} />}
        <button onClick={handleAdd} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando...' : '+ Agregar foto'}</button>
      </div>

      <div className="photo-grid">
        {photos.map(photo => (
          <div key={photo.id} className="aspect-square relative group overflow-hidden rounded-sm">
            <img src={photo.image_url} alt="" className="w-full h-full object-cover" />
            <button onClick={() => handleDelete(photo.id)}
              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== DISPONIBILIDAD TAB ====================
function AvailabilityTab({ availability, setAvailability }) {
  const [saving, setSaving] = useState(false);

  const toggle = (i) => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, enabled: !d.enabled } : d));
  const update = (i, field, value) => setAvailability(prev => prev.map((d, idx) => idx === i ? { ...d, [field]: value } : d));

  const handleSave = async () => {
    setSaving(true);
    try {
      const slots = availability.filter(d => d.enabled);
      await api.post('/barbers/availability', { slots });
      toast.success('Disponibilidad guardada ✅');
    } catch (err) {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="space-y-3 mb-5">
        {availability.map((day, i) => (
          <div key={i} className={`card p-4 transition-all ${day.enabled ? 'border-gold-500/30' : ''}`}>
            <div className="flex items-center justify-between mb-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  onClick={() => toggle(i)}
                  className={`w-10 h-6 rounded-full transition-colors relative cursor-pointer ${day.enabled ? 'bg-gold-500' : 'bg-dark-500'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${day.enabled ? 'left-5' : 'left-1'}`} />
                </div>
                <span className={`font-medium ${day.enabled ? 'text-white' : 'text-gray-500'}`}>{DAYS_NAMES[day.day_of_week]}</span>
              </label>
            </div>

            {day.enabled && (
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label text-xs">Inicio</label>
                  <input type="time" className="input-field py-2 text-sm" value={day.start_time}
                    onChange={e => update(i, 'start_time', e.target.value)} />
                </div>
                <div>
                  <label className="label text-xs">Fin</label>
                  <input type="time" className="input-field py-2 text-sm" value={day.end_time}
                    onChange={e => update(i, 'end_time', e.target.value)} />
                </div>
                <div>
                  <label className="label text-xs">Duración cita</label>
                  <select className="input-field py-2 text-sm" value={day.slot_duration_minutes}
                    onChange={e => update(i, 'slot_duration_minutes', parseInt(e.target.value))}>
                    <option value={15}>15 min</option>
                    <option value={30}>30 min</option>
                    <option value={45}>45 min</option>
                    <option value={60}>1 hora</option>
                  </select>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      <button onClick={handleSave} disabled={saving} className="btn-primary w-full">
        {saving ? 'Guardando...' : '💾 Guardar disponibilidad'}
      </button>
    </div>
  );
}

// ==================== SERVICIOS TAB ====================
function ServicesTab({ services, onRefresh }) {
  const [form, setForm] = useState({ name: '', price: '', duration_minutes: 30, description: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name || !form.price) return toast.error('Nombre y precio requeridos');
    setSaving(true);
    try {
      await api.post('/barbers/services', form);
      toast.success('Servicio agregado');
      setForm({ name: '', price: '', duration_minutes: 30, description: '' });
      onRefresh();
    } catch (err) {
      toast.error('Error al agregar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este servicio?')) return;
    try {
      await api.delete(`/barbers/services/${id}`);
      toast.success('Servicio eliminado');
      onRefresh();
    } catch (err) {
      toast.error('Error');
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4">
        <h3 className="font-medium text-white mb-3">+ Nuevo servicio</h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input className="input-field" placeholder="Nombre (ej. Corte clásico)" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <input type="number" className="input-field" placeholder="Precio ₡" value={form.price}
            onChange={e => setForm({ ...form, price: e.target.value })} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <select className="input-field" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: parseInt(e.target.value) })}>
            <option value={15}>15 min</option>
            <option value={30}>30 min</option>
            <option value={45}>45 min</option>
            <option value={60}>1 hora</option>
          </select>
          <input className="input-field" placeholder="Descripción (opcional)" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <button onClick={handleAdd} disabled={saving} className="btn-primary w-full">{saving ? 'Guardando...' : '+ Agregar'}</button>
      </div>

      <div className="space-y-2">
        {services.map(svc => (
          <div key={svc.id} className="card p-3 flex items-center justify-between">
            <div>
              <span className="font-medium text-white text-sm">{svc.name}</span>
              <span className="text-xs text-gray-500 ml-2">{svc.duration_minutes}min</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gold-400 font-bold">₡{svc.price}</span>
              <button onClick={() => handleDelete(svc.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ==================== FIDELIDAD TAB ====================
function LoyaltyTab({ loyaltyCards, onRefresh }) {
  const [form, setForm] = useState({ name: '', required_visits: 5, reward_type: 'free_haircut', reward_value: '', description: '' });
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!form.name) return toast.error('Nombre requerido');
    setSaving(true);
    try {
      await api.post('/loyalty', form);
      toast.success('Tarjeta creada ✅');
      setForm({ name: '', required_visits: 5, reward_type: 'free_haircut', reward_value: '', description: '' });
      onRefresh();
    } catch (err) {
      toast.error('Error al crear');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (id, is_active) => {
    try {
      await api.put(`/loyalty/${id}`, { is_active: !is_active });
      toast.success(is_active ? 'Desactivada' : 'Activada');
      onRefresh();
    } catch (err) {}
  };

  return (
    <div className="animate-fade-in">
      <div className="card p-4 mb-4 border-gold-500/20">
        <h3 className="font-medium text-white mb-3 flex items-center gap-2">
          <Award className="w-4 h-4 text-gold-400" /> Nueva tarjeta de fidelidad
        </h3>
        <div className="space-y-2 mb-3">
          <input className="input-field" placeholder="Nombre de la tarjeta" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="label">Cortes requeridos</label>
              <input type="number" min="1" className="input-field" value={form.required_visits}
                onChange={e => setForm({ ...form, required_visits: parseInt(e.target.value) })} />
            </div>
            <div>
              <label className="label">Recompensa</label>
              <select className="input-field" value={form.reward_type}
                onChange={e => setForm({ ...form, reward_type: e.target.value })}>
                {REWARD_TYPES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          {['discount', 'eyebrow_discount', 'beard_discount', 'design_discount'].includes(form.reward_type) && (
            <input type="number" className="input-field" placeholder="Porcentaje de descuento (ej. 20)"
              value={form.reward_value} onChange={e => setForm({ ...form, reward_value: e.target.value })} />
          )}
          <input className="input-field" placeholder="Descripción adicional (opcional)"
            value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
        </div>
        <button onClick={handleAdd} disabled={saving} className="btn-primary w-full">
          {saving ? 'Guardando...' : '+ Crear tarjeta'}
        </button>
      </div>

      <div className="space-y-3">
        {loyaltyCards.map(card => (
          <div key={card.id} className={`card p-4 ${!card.is_active ? 'opacity-50' : 'border-gold-500/20'}`}>
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-medium text-white">{card.name}</h4>
                <p className="text-sm text-gray-400 mt-0.5">
                  {REWARD_TYPES.find(r => r.value === card.reward_type)?.label} · {card.required_visits} cortes
                </p>
                {card.description && <p className="text-xs text-gray-500 mt-1">{card.description}</p>}
              </div>
              <button onClick={() => toggleActive(card.id, card.is_active)}
                className={`text-xs px-3 py-1 rounded-lg font-medium transition-colors ${
                  card.is_active ? 'bg-red-900/40 text-red-400 hover:bg-red-900/60' : 'bg-emerald-900/40 text-emerald-400 hover:bg-emerald-900/60'
                }`}>
                {card.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
