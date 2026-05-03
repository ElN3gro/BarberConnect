# 📋 Guía de Despliegue — BarberConnect

## PASO 1: Subir a GitHub

```bash
# Desde la raíz del proyecto
cd barberconnect
git init
git add .
git commit -m "feat: BarberConnect inicial"

# Crear repositorio en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/barberconnect.git
git push -u origin main
```

---

## PASO 2: Cuenta de Cloudinary (subir fotos GRATIS)

1. Ir a [cloudinary.com](https://cloudinary.com) → Sign Up (gratis)
2. Dashboard → copiar:
   - Cloud name
   - API Key
   - API Secret
3. Guardar para el paso 4

---

## PASO 3: WhatsApp Cloud API (Meta)

### 3a. Crear la App
1. Ir a [developers.facebook.com](https://developers.facebook.com)
2. **My Apps → Create App → Business**
3. Nombre: `BarberConnect Bot`
4. Agregar producto: **WhatsApp**

### 3b. Obtener credenciales
En **WhatsApp → API Setup**:
- Copiar **Temporary access token** (luego hacerlo permanente)
- Copiar **Phone number ID**
- El número de prueba ya viene configurado

### 3c. Token permanente
1. Meta Business Suite → Configuración
2. Usuarios del sistema → Agregar usuario del sistema
3. Asignar activo: tu app
4. Generar token → permisos: `whatsapp_business_messaging`

### 3d. Configurar Webhook (después de tener la URL del backend)
- URL: `https://barberconnect-api.onrender.com/api/bot/webhook`
- Token de verificación: el que pongas en `WHATSAPP_VERIFY_TOKEN`
- Suscribir a: **messages**

---

## PASO 4: Render — Base de datos

1. [render.com](https://render.com) → New → **PostgreSQL**
2. Nombre: `barberconnect-db`
3. Plan: Free
4. Copiar **External Database URL**

---

## PASO 5: Render — Backend

1. New → **Web Service**
2. Conectar repositorio GitHub: `barberconnect`
3. **Configuración:**
   - Root Directory: `backend`
   - Runtime: Node
   - Build Command: `npm install && npm run migrate`
   - Start Command: `npm start`

4. **Variables de entorno (agregar todas):**

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `DATABASE_URL` | URL copiada del paso 4 |
| `JWT_SECRET` | Texto aleatorio largo (ej: genera uno en [randomkeygen.com](https://randomkeygen.com)) |
| `FRONTEND_URL` | `https://barberconnect.onrender.com` (ajustar después) |
| `WHATSAPP_TOKEN` | Token de Meta del paso 3 |
| `WHATSAPP_PHONE_ID` | Phone Number ID de Meta |
| `WHATSAPP_VERIFY_TOKEN` | Texto que tú eliges (ej: `mi_token_barber_2024`) |
| `CLOUDINARY_CLOUD_NAME` | Del paso 2 |
| `CLOUDINARY_API_KEY` | Del paso 2 |
| `CLOUDINARY_API_SECRET` | Del paso 2 |
| `ADMIN_EMAIL` | Email del admin (ej: `admin@tubarberia.com`) |
| `ADMIN_PASSWORD` | Contraseña del admin |

5. **Deploy** → Copiar la URL resultante (ej: `https://barberconnect-api.onrender.com`)

---

## PASO 6: Render — Frontend

1. New → **Static Site**
2. Conectar mismo repositorio
3. **Configuración:**
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`

4. **Variables de entorno:**

| Variable | Valor |
|----------|-------|
| `VITE_API_URL` | `https://barberconnect-api.onrender.com/api` |

5. Deploy → Copiar URL (ej: `https://barberconnect.onrender.com`)

---

## PASO 7: Actualizar FRONTEND_URL en el backend

En Render → barberconnect-api → Environment:
- Actualizar `FRONTEND_URL` con la URL real del frontend

---

## PASO 8: Configurar Webhook de WhatsApp

Con la URL del backend ya disponible:
1. developers.facebook.com → Tu App → WhatsApp → Configuration
2. Webhook URL: `https://barberconnect-api.onrender.com/api/bot/webhook`
3. Verify Token: el mismo que pusiste en `WHATSAPP_VERIFY_TOKEN`
4. Clic en **Verify and Save**
5. Suscribir a **messages**

---

## PASO 9: Verificar que todo funciona

### Checklist:
- [ ] Abrir frontend en el navegador
- [ ] Registrarse como cliente
- [ ] Registrarse como barbero (con número de WA)
- [ ] Entrar como admin y aprobar al barbero
- [ ] Verificar que al aprobar, el barbero recibe WA
- [ ] Agendar una cita como cliente
- [ ] Verificar que el barbero recibe notificación WA
- [ ] En WA, responder `CONFIRMAR [id]` y verificar que funciona

---

## Credenciales de Admin por defecto

```
Email: admin@barberconnect.com  (o el que pusiste en ADMIN_EMAIL)
Password: Admin123!             (o el que pusiste en ADMIN_PASSWORD)
```

**⚠️ Cambiar estas credenciales en producción.**

---

## Problemas comunes

**Backend no conecta a DB:**
- Verificar que `DATABASE_URL` incluye `?sslmode=require` al final si es necesario

**Bot no responde:**
- Verificar que el webhook está verificado en Meta
- Verificar logs del backend en Render

**Fotos no cargan:**
- Verificar credenciales de Cloudinary
- Para pruebas, puedes usar URLs de imgbb.com o imgur.com directamente

**Free tier de Render se "duerme":**
- Los servicios gratuitos se duermen tras 15 min de inactividad
- El bot cron no funciona bien en free tier → considerar plan Starter ($7/mes)
- Alternativa: usar [cron-job.org](https://cron-job.org) para hacer ping al backend cada 10 min

---

## Arquitectura final

```
GitHub (código fuente)
    ↓
Render Static (Frontend React)     →   barberconnect.onrender.com
Render Web Service (Backend Node)  →   barberconnect-api.onrender.com
Render PostgreSQL (Base de datos)
    ↑
Meta WhatsApp Cloud API (Bot 24/7)
    ↕
Barberos y Clientes (por WhatsApp)
```
