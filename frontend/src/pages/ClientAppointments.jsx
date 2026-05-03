import { useState, useEffect } from 'react';
import api from '../utils/api';
import { Calendar, Clock, MapPin, Scissors } from 'lucide-react';

const STATUS_LABELS = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada', completed: 'Completada' };
const STATUS_COLORS = { pending: 'badge-yellow', confirmed: 'badge-green', cancelled: 'badge-red', completed: 'badge-gold' };

export default function ClientAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/appointments/my')
      .then(r => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const upcoming = appointments.filter(a => a.status !== 'cancelled' && a.status !== 'completed');
  const past = appointments.filter(a => a.status === 'cancelled' || a.status === 'completed');

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 pt-20 pb-10">
      <h1 className="font-display text-2xl font-bold text-white mb-6">Mis Citas</h1>

      {appointments.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-lg">Sin citas aún</p>
          <p className="text-sm mt-1">Visita el perfil de un barbero para agendar</p>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-6">
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Próximas</h2>
              <div className="space-y-3">
                {upcoming.map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
              </div>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Historial</h2>
              <div className="space-y-3 opacity-70">
                {past.map(appt => <AppointmentCard key={appt.id} appt={appt} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AppointmentCard({ appt }) {
  return (
    <div className="card p-4 animate-slide-up">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-dark-600 border border-dark-500 flex items-center justify-center overflow-hidden">
            {appt.barber_avatar ? (
              <img src={appt.barber_avatar} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-gold-400 font-bold">{appt.barber_name?.charAt(0)}</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-white">{appt.barber_name}</h3>
            {appt.location && <p className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" />{appt.location}</p>}
          </div>
        </div>
        <span className={STATUS_COLORS[appt.status]}>{STATUS_LABELS[appt.status]}</span>
      </div>

      <div className="flex flex-wrap gap-3 text-sm text-gray-400 mt-2">
        <span className="flex items-center gap-1">
          <Calendar className="w-3.5 h-3.5" />
          {appt.appointment_date?.substring(0,10)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {appt.appointment_time?.substring(0,5)}
        </span>
        {appt.service_name && (
          <span className="flex items-center gap-1">
            <Scissors className="w-3.5 h-3.5" />
            {appt.service_name}
            {appt.price && <span className="text-gold-400 ml-1">₡{appt.price}</span>}
          </span>
        )}
      </div>

      {appt.is_home_service && (
        <span className="badge-green mt-2">🏠 A domicilio</span>
      )}

      {appt.notes && (
        <p className="text-xs text-gray-500 italic mt-2 border-t border-dark-600 pt-2">"{appt.notes}"</p>
      )}

      {appt.barber_comment && (
        <div className="mt-2 pt-2 border-t border-dark-600">
          <p className="text-xs text-gray-400">💬 Barbero: <span className="italic">{appt.barber_comment}</span></p>
        </div>
      )}
    </div>
  );
}
