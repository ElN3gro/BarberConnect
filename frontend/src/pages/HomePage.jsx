import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { MapPin, Home, Star, Camera, Users } from 'lucide-react';

export default function HomePage() {
  const [tab, setTab] = useState('barberias'); // 'barberias' | 'todos'
  const [barbers, setBarbers] = useState([]);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [barbersRes, feedRes] = await Promise.all([
        api.get('/barbers'),
        api.get('/barbers/feed/all'),
      ]);
      setBarbers(barbersRes.data);
      setFeed(feedRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pt-16 pb-8">

      {/* Header con tabs */}
      <div className="flex items-center gap-1 mt-6 mb-6 bg-dark-800 rounded-xl p-1 border border-dark-600">
        <button
          onClick={() => setTab('barberias')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === 'barberias'
              ? 'bg-gold-500 text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          ✂️ Barbería
        </button>
        <button
          onClick={() => setTab('todos')}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-all ${
            tab === 'todos'
              ? 'bg-gold-500 text-black'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          📸 Todos
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : tab === 'barberias' ? (
        <BarbersGrid barbers={barbers} />
      ) : (
        <PhotoFeed feed={feed} />
      )}
    </div>
  );
}

function BarbersGrid({ barbers }) {
  if (barbers.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No hay barberos disponibles aún</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">
      {barbers.map(barber => (
        <Link key={barber.profile_id} to={`/barber/${barber.profile_id}`}>
          <div className="card hover:border-gold-500/40 transition-all duration-300 group overflow-hidden">
            {/* Banner */}
            <div className="h-24 bg-gradient-to-br from-dark-600 to-dark-700 relative overflow-hidden">
              {barber.banner_url && (
                <img src={barber.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-dark-800/80 to-transparent" />
            </div>

            <div className="p-4 -mt-8 relative">
              {/* Avatar */}
              <div className="flex items-end justify-between mb-3">
                <div className="w-16 h-16 rounded-xl border-2 border-dark-800 overflow-hidden bg-dark-600 shadow-lg">
                  {barber.avatar_url ? (
                    <img src={barber.avatar_url} alt={barber.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-2xl font-display font-bold text-gold-400">
                      {barber.name.charAt(0)}
                    </div>
                  )}
                </div>
                <span className="badge-gold text-xs">{barber.photo_count || 0} fotos</span>
              </div>

              <h3 className="font-semibold text-white group-hover:text-gold-400 transition-colors">{barber.name}</h3>

              {barber.location && (
                <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                  <MapPin className="w-3 h-3" /> {barber.location}
                </div>
              )}

              <div className="flex items-center gap-3 mt-3">
                {barber.does_home_service && (
                  <span className="badge-green">
                    <Home className="w-3 h-3" /> A domicilio
                  </span>
                )}
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  <Star className="w-3 h-3 text-gold-500" fill="currentColor" />
                  {parseFloat(barber.rating || 4.5).toFixed(1)}
                </span>
              </div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function PhotoFeed({ feed }) {
  const [likedPhotos, setLikedPhotos] = useState(new Set());

  const handleLike = async (photoId) => {
    try {
      const { data } = await api.post(`/photos/${photoId}/like`);
      setLikedPhotos(prev => {
        const next = new Set(prev);
        data.liked ? next.add(photoId) : next.delete(photoId);
        return next;
      });
    } catch (err) {}
  };

  if (feed.length === 0) {
    return (
      <div className="text-center py-16 text-gray-500">
        <Camera className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p>No hay fotos publicadas aún</p>
      </div>
    );
  }

  // Carrusel grande (3 primeras fotos)
  const featured = feed.slice(0, 3);
  const rest = feed.slice(3);

  return (
    <div className="animate-fade-in">
      {/* Carrusel */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-2 mb-6">
        {featured.map(photo => (
          <div key={photo.id} className="flex-shrink-0 w-64 h-48 rounded-xl overflow-hidden relative group">
            <img src={photo.image_url} alt={photo.caption} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
              <Link to={`/barber/${photo.barber_profile_id}`} className="flex items-center gap-2">
                <img src={photo.barber_avatar} alt={photo.barber_name} className="w-6 h-6 rounded-full" />
                <span className="text-white text-xs font-medium">{photo.barber_name}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Grid Instagram */}
      <div className="photo-grid">
        {feed.map(photo => (
          <div key={photo.id} className="aspect-square relative group overflow-hidden bg-dark-700">
            <img
              src={photo.image_url}
              alt={photo.caption}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
              <button
                onClick={() => handleLike(photo.id)}
                className={`text-2xl transition-transform active:scale-75 ${likedPhotos.has(photo.id) ? 'text-red-500' : 'text-white'}`}
              >
                ❤️
              </button>
              <span className="text-white text-sm font-medium">{photo.likes}</span>
              <Link
                to={`/barber/${photo.barber_profile_id}`}
                className="flex items-center gap-1.5 bg-white/20 backdrop-blur px-3 py-1 rounded-full"
              >
                {photo.barber_avatar && <img src={photo.barber_avatar} alt="" className="w-4 h-4 rounded-full" />}
                <span className="text-white text-xs">{photo.barber_name}</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
