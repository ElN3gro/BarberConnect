# BarberConnect 💈

Plataforma web full-stack para gestión de barberías con bot de WhatsApp integrado.

## Stack Tecnológico

- **Frontend**: React 18 + Vite + TailwindCSS
- **Backend**: Node.js + Express
- **Base de datos**: PostgreSQL (Render)
- **Bot**: WhatsApp Cloud API (Meta)
- **Deploy**: Render (backend + DB) + Render Static (frontend)
- **Control de versiones**: GitHub

---

## Estructura del Proyecto

```
barberconnect/
├── frontend/          → React App
├── backend/           → Express API + Bot
└── docs/              → Documentación adicional
```

---

## 1. Configuración Inicial

### Clonar el repositorio
```bash
git clone https://github.com/TU_USUARIO/barberconnect.git
cd barberconnect
```

---

## 2. Base de Datos (PostgreSQL en Render)

1. Ir a [Render.com](https://render.com) → New → PostgreSQL
2. Nombre: `barberconnect-db`
3. Copiar el `External Database URL`
4. Pegar en `backend/.env` como `DATABASE_URL`

---

## 3. Backend (API + Bot)

```bash
cd backend
npm install
cp .env.example .env
# Editar .env con tus credenciales
npm run dev
```

### Variables de entorno backend (`backend/.env`):
```
DATABASE_URL=postgresql://...
JWT_SECRET=tu_secreto_super_seguro_aqui
PORT=5000

# WhatsApp Cloud API (Meta)
WHATSAPP_TOKEN=tu_token_permanente
WHATSAPP_PHONE_ID=id_de_tu_numero
WHATSAPP_VERIFY_TOKEN=token_verificacion_webhook

# URL del frontend (para links en mensajes)
FRONTEND_URL=https://barberconnect.onrender.com
```

---

## 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env
# Editar VITE_API_URL con la URL de tu backend
npm run dev
```

### Variables de entorno frontend (`frontend/.env`):
```
VITE_API_URL=http://localhost:5000/api
```

---

## 5. WhatsApp Cloud API (Meta)

### Pasos para configurar:
1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. Crear App → Tipo: Business
3. Agregar producto **WhatsApp**
4. En WhatsApp > Configuración de API:
   - Copiar **Token de acceso temporal** (luego generar permanente)
   - Copiar **Phone Number ID**
5. Configurar Webhook:
   - URL: `https://tu-backend.onrender.com/api/bot/webhook`
   - Token de verificación: el mismo que en `WHATSAPP_VERIFY_TOKEN`
   - Suscribir a: `messages`
6. Para token permanente: Crear System User en Meta Business Suite

---

## 6. Deploy en Render

### Backend:
1. New → Web Service → conectar repo GitHub
2. Root Directory: `backend`
3. Build Command: `npm install && npm run migrate`
4. Start Command: `npm start`
5. Agregar variables de entorno

### Frontend:
1. New → Static Site → conectar repo GitHub  
2. Root Directory: `frontend`
3. Build Command: `npm run build`
4. Publish Directory: `dist`
5. Agregar `VITE_API_URL` con URL del backend

---

## 7. Flujo del Bot de WhatsApp

```
Cliente escribe al número del bot
    ↓
Bot responde con lista de barberos disponibles
    ↓
Cliente selecciona barbero
    ↓
Bot redirige: "Agenda tu cita aquí: [link]"
    ↓
Cliente agenda en la web
    ↓
Bot notifica al barbero (mensaje inmediato)
    ↓
Bot envía recordatorio 24h antes al barbero
```

---

## 8. Roles y Permisos

| Función | Admin | Barbero | Cliente |
|---------|-------|---------|---------|
| Aprobar barberos | ✅ | ❌ | ❌ |
| Ver todos los usuarios | ✅ | ❌ | ❌ |
| Subir fotos de cortes | ❌ | ✅ | ❌ |
| Gestionar disponibilidad | ❌ | ✅ | ❌ |
| Crear tarjetas fidelidad | ❌ | ✅ | ❌ |
| Agendar citas | ❌ | ❌ | ✅ |
| Ver su historial de citas | ❌ | ✅ | ✅ |

---

## Contacto / Soporte

Proyecto académico - Carrera Técnica en Informática
