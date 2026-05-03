import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { MapPin, Home, Phone, Camera, Star, ChevronLeft, ChevronRight, Clock, DollarSign, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { format, addDays, startOfWeek, isBefore, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';

const DAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const REWARD_LABELS = {
  free_haircut: '✂️ Corte gratis',
  discount: '💰 Descuento',
  priority: '⚡ Prioridad de corte',
  free_eyebrows: '👁️ Cejas gratis',
  free_design: '🎨 Diseño gratis',
  free_beard: '🧔 Barba gratis',
  eyebrow_discount: '💰 Desc. en cejas',
  beard_discount: '💰 Desc. en barba',
  design_discount: '💰 Desc. en diseño',
};

export default function BarberProfilePage() {
  const { barberId } = useParams();
  const { user } = useAuth();
  const [barber, setBarber] = useState(null);
  const [loyaltyCards, setLoyaltyCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('fotos');
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedService, setSelectedService] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [booking, setBooking] = useState(false);
  const [notes, setNotes] = useState('');
  const [isHomeService, setIsHomeService] = useState(false);
  const [clientAddress, setClientAddress] = useState('');

  useEffect(() => {
    loadBarber();
  }, [barberId]);

  useEffect(() => {
    if (selectedDate) loadSlots(selectedDate);
  }, [selectedDate]);

  const loadBarber = async () => {
    try {
      const [barberRes, loyaltyRes] = await Promise.all([
        api.get(`/barbers/${barberId}`),
        api.get(`/loyalty/barber/${barberId}`),
      ]);
      setBarber(barberRes.data);
      setLoyaltyCards(loyaltyRes.data);
    } catch (err) {
      toast.error('Error al cargar perfil');
    } finally {
      setLoading(false);
    }
  };

  const loadSlots = async (date) => {
    setSlotsLoading(true);
    setSelectedTime(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data } = await api.get(`/barbers/${barberId}/slots?date=${dateStr}`);
      setSlots(data.slots || []);
    } catch (err) {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleBook = async () => {
    if (!selectedDate || !selectedTime) return toast.error('Selecciona fecha y hora');
    setBooking(true);
    try {
      await api.post('/appointments', {
        barber_id: parseInt(barberId),
        service_id: selectedService,
        appointment_date: format(selectedDate, 'yyyy-MM-dd'),
        appointment_time: selectedTime,
        is_home_service: isHomeService,
        client_address: clientAddress,
        notes,
      });
      toast.success('✅ ¡Cita agendada! El barbero recibirá una notificación por WhatsApp.');
      setSelectedDate(null);
      setSelectedTime(null);
      setNotes('');
      setSlots([]);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al agendar');
    } finally {
      setBooking(false);
    }
  };

  const getAvailableDays = () => {
    if (!barber?.availability) return new Set();
    return new Set(barber.availability.map(a => a.day_of_week));
  };

  const availableDays = getAvailableDays();
  const today = startOfDay(new Date());

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!barber) return (
    <div className="text-center py-20 text-gray-500 pt-20">Barbero no encontrado</div>
  );

  return (
    <div className="pt-14 pb-10">
      {/* Banner */}
      <div className="h-48 sm:h-60 relative overflow-hidden bg-gradient-to-br from-dark-700 to-dark-600">
        {barber.banner_url ? (
          <img src={barber.banner_url} alt="" className="w-full h-full object-cover opacity-50" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-dark-600 via-dark-700 to-dark-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900 via-transparent to-transparent" />
      </div>

      <div className="max-w-4xl mx-auto px-4">
        {/* Profile info */}
        <div className="flex items-end gap-4 -mt-12 mb-4 relative z-10">
          <div className="w-20 h-20 rounded-2xl border-4 border-dark-900 overflow-hidden bg-dark-600 shadow-2xl flex-shrink-0">
            {barber.avatar_url ? (
              <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-display font-bold text-gold-400">
                {barber.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="pb-1">
            <h1 className="font-display text-2xl font-bold text-white">{barber.name}</h1>
            {barber.location && (
              <div className="flex items-center gap-1 text-gray-500 text-sm">
                <MapPin className="w-3.5 h-3.5" /> {barber.location}
              </div>
            )}
          </div>
        </div>

        {/* Bio y badges */}
        <div className="flex flex-wrap gap-2 mb-3">
          {barber.does_home_service && (
            <span className="badge-green"><Home className="w-3 h-3" /> A domicilio — ₡{barber.home_service_price}</span>
          )}
          {barber.phone && (
            <span className="badge-gold"><Phone className="w-3 h-3" /> {barber.phone}</span>
          )}
        </div>

        {barber.bio && <p className="text-gray-400 text-sm mb-4 leading-relaxed">{barber.bio}</p>}

        <hr className="gold-divider" />

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-dark-800 p-1 rounded-xl border border-dark-600">
          {['fotos', 'agenda', 'servicios', 'fidelidad'].map(t => (
            <button
              key={t}
              onClick={() => setActiveTab(t)}
              className={`flex-1 py-2 text-xs font-medium rounded-lg capitalize transition-all ${
                activeTab === t ? 'bg-gold-500 text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'fotos' ? '📸 Fotos' : t === 'agenda' ? '📅 Agenda' : t === 'servicios' ? '💈 Servicios' : '⭐ Fidelidad'}
            </button>
          ))}
        </div>

        {/* FOTOS */}
        {activeTab === 'fotos' && (
          <div className="photo-grid animate-fade-in">
            {barber.photos?.length > 0 ? barber.photos.map(photo => (
              <div key={photo.id} className="aspect-square overflow-hidden rounded-sm">
                <img src={photo.image_url} alt={photo.caption} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" />
              </div>
            )) : (
              <div className="col-span-3 text-center py-12 text-gray-500">
                <Camera className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Sin fotos aún</p>
              </div>
            )}
          </div>
        )}

        {/* AGENDA */}
        {activeTab === 'agenda' && user?.role === 'client' && (
          <div className="animate-fade-in">
            <h3 className="font-semibold text-white mb-4">Selecciona una fecha</h3>

            {/* Navegador de semana */}
            <div className="flex items-center gap-2 mb-4">
              <button onClick={() => setWeekStart(addDays(weekStart, -7))} className="btn-ghost p-2">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="flex-1 grid grid-cols-7 gap-1">
                {weekDays.map((day) => {
                  const dow = day.getDay();
                  const isAvailable = availableDays.has(dow);
                  const isPast = isBefore(day, today);
                  const isSelected = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd');

                  return (
                    <button
                      key={day.toString()}
                      disabled={!isAvailable || isPast}
                      onClick={() => setSelectedDate(day)}
                      className={`flex flex-col items-center py-2 px-1 rounded-lg text-xs transition-all ${
                        isSelected
                          ? 'bg-gold-500 text-black font-bold'
                          : isAvailable && !isPast
                          ? 'bg-dark-700 text-white hover:bg-dark-600 border border-dark-500'
                          : 'text-dark-400 cursor-not-allowed opacity-30'
                      }`}
                    >
                      <span className="text-[10px]">{DAYS[dow]}</span>
                      <span className="font-semibold">{format(day, 'd')}</span>
                    </button>
                  );
                })}
              </div>
              <button onClick={() => setWeekStart(addDays(weekStart, 7))} className="btn-ghost p-2">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {selectedDate && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-400 mb-3">
                  <Clock className="w-4 h-4 inline mr-1" />
                  Horarios disponibles — {format(selectedDate, "EEEE d 'de' MMMM", { locale: es })}
                </h4>
                {slotsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="w-6 h-6 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : slots.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-4">
                    {slots.map(slot => (
                      <button
                        key={slot.time}
                        disabled={!slot.available}
                        onClick={() => setSelectedTime(slot.time)}
                        className={`py-2 px-1 rounded-lg text-sm font-medium transition-all ${
                          selectedTime === slot.time
                            ? 'bg-gold-500 text-black'
                            : slot.available
                            ? 'bg-dark-700 text-white hover:border-gold-500 border border-dark-500'
                            : 'bg-dark-800 text-dark-400 cursor-not-allowed opacity-40 line-through'
                        }`}
                      >
                        {slot.time}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm text-center py-4">No hay horarios disponibles este día</p>
                )}
              </div>
            )}

            {/* Servicio */}
            {barber.services?.length > 0 && (
              <div className="mt-4">
                <label className="label">Servicio (opcional)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {barber.services.map(svc => (
                    <button
                      key={svc.id}
                      onClick={() => setSelectedService(selectedService === svc.id ? null : svc.id)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        selectedService === svc.id
                          ? 'border-gold-500 bg-gold-500/10'
                          : 'border-dark-500 hover:border-dark-400'
                      }`}
                    >
                      <div className="font-medium text-sm text-white">{svc.name}</div>
                      <div className="text-xs text-gray-500">₡{svc.price} · {svc.duration_minutes} min</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* A domicilio */}
            {barber.does_home_service && (
              <div className="mt-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHomeService}
                    onChange={e => setIsHomeService(e.target.checked)}
                    className="accent-gold-500 w-4 h-4"
                  />
                  <span className="text-sm text-gray-300">Servicio a domicilio (+₡{barber.home_service_price})</span>
                </label>
                {isHomeService && (
                  <input
                    className="input-field mt-2"
                    placeholder="Tu dirección..."
                    value={clientAddress}
                    onChange={e => setClientAddress(e.target.value)}
                  />
                )}
              </div>
            )}

            {/* Notas */}
            <div className="mt-4">
              <label className="label">Notas adicionales (opcional)</label>
              <textarea
                className="input-field resize-none"
                rows={2}
                placeholder="Tipo de corte, preferencias..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>

            <button
              onClick={handleBook}
              disabled={!selectedDate || !selectedTime || booking}
              className="btn-primary w-full mt-4 py-3"
            >
              {booking ? 'Agendando...' : selectedDate && selectedTime
                ? `Confirmar cita — ${format(selectedDate, 'd MMM', { locale: es })} a las ${selectedTime}`
                : 'Selecciona fecha y hora'}
            </button>
          </div>
        )}

        {activeTab === 'agenda' && user?.role !== 'client' && (
          <div className="text-center py-12 text-gray-500">
            <p>Inicia sesión como cliente para agendar una cita</p>
          </div>
        )}

        {/* SERVICIOS */}
        {activeTab === 'servicios' && (
          <div className="space-y-3 animate-fade-in">
            {barber.services?.length > 0 ? barber.services.map(svc => (
              <div key={svc.id} className="card p-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-white">{svc.name}</h4>
                  {svc.description && <p className="text-xs text-gray-500 mt-0.5">{svc.description}</p>}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {svc.duration_minutes} min
                    </span>
                  </div>
                </div>
                <span className="font-display font-bold text-gold-400 text-lg">₡{svc.price}</span>
              </div>
            )) : (
              <p className="text-gray-500 text-center py-8">Sin servicios configurados</p>
            )}
          </div>
        )}

        {/* FIDELIDAD */}
        {activeTab === 'fidelidad' && (
          <div className="space-y-3 animate-fade-in">
            {loyaltyCards.length > 0 ? loyaltyCards.map(card => (
              <div key={card.id} className="card p-4 border-gold-500/20">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-medium text-white">{card.name}</h4>
                  <span className="badge-gold">
                    <Award className="w-3 h-3" />
                    {REWARD_LABELS[card.reward_type] || card.reward_type}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <span>Luego de <strong className="text-gold-400">{card.required_visits}</strong> cortes</span>
                  {card.reward_value && <span className="text-gray-500">· {card.reward_value}% off</span>}
                </div>
                {card.description && <p className="text-xs text-gray-500 mt-1">{card.description}</p>}

                {/* Progreso visual */}
                <div className="flex gap-1 mt-3">
                  {Array.from({ length: Math.min(card.required_visits, 10) }, (_, i) => (
                    <div key={i} className="flex-1 h-1.5 rounded-full bg-dark-500" />
                  ))}
                </div>
              </div>
            )) : (
              <div className="text-center py-12 text-gray-500">
                <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p>Sin tarjetas de fidelidad activas</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
