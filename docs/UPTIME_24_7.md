# Guia 24/7 — BarberConnect siempre activo (GRATIS)

El problema del plan gratuito de Render es que "duerme" el servidor
tras 15 minutos sin recibir peticiones. La solucion es doble:

1. El backend tiene un endpoint GET /ping que responde en milisegundos
2. UptimeRobot (gratuito) hace ping cada 5 minutos automaticamente

Con ambas capas el servidor jamas se duerme.

---

## Capa 1: Endpoint /ping (ya incluido en el backend)

La URL que usaras es:
  https://TU-BACKEND.onrender.com/ping

Responde:
  { "status": "alive", "timestamp": "2025-01-01T00:00:00.000Z" }

Ademas hay un cron interno en el servidor que se hace auto-ping cada
14 minutos como segunda capa de seguridad (configurado con BACKEND_URL).

---

## Capa 2: UptimeRobot (recomendado — 100% gratuito)

### Por que UptimeRobot?
- Gratis hasta 50 monitores
- Pings cada 5 minutos en el plan free
- Alertas por email si el servidor cae
- Dashboard de historial de uptime
- Sin tarjeta de credito

### Pasos:

1. Ir a https://uptimerobot.com
2. Crear cuenta gratuita (con tu email)
3. Dashboard -> Add New Monitor
4. Completar:
   - Monitor Type: HTTP(s)
   - Friendly Name: BarberConnect API
   - URL: https://TU-BACKEND.onrender.com/ping
   - Monitoring Interval: Every 5 minutes
5. Clic en "Create Monitor"

Listo. UptimeRobot hara ping cada 5 minutos y Render nunca dormira.

---

## Capa 3 (opcional): cron-job.org como triple respaldo

Si quieres un tercer nivel de seguridad (totalmente gratis):

1. Ir a https://cron-job.org
2. Crear cuenta gratuita
3. Create Cronjob:
   - URL: https://TU-BACKEND.onrender.com/ping
   - Schedule: Every 10 minutes
4. Guardar

---

## Capa 4 (opcional): UptimeKuma — panel propio (AVANZADO)

Si quieres un panel de monitoreo propio con interfaz bonita,
puedes correr UptimeKuma (open source) en otro servicio de Render:

1. New -> Web Service en Render
2. Docker image: louislam/uptime-kuma:1
3. Disk: 1GB (para persistencia)
4. Una vez desplegado, agregar tu URL /ping ahi

---

## Resumen de URLs a monitorear

| Servicio      | URL a pingear                                        |
|---------------|------------------------------------------------------|
| API Backend   | https://TU-BACKEND.onrender.com/ping                 |
| Health check  | https://TU-BACKEND.onrender.com/health               |
| Frontend      | https://TU-FRONTEND.onrender.com (opcional)          |

El frontend es un sitio estatico y no se duerme, solo el backend necesita ping.

---

## Variable de entorno requerida en Render

En tu servicio backend de Render agregar:

  BACKEND_URL = https://barberconnect-api.onrender.com

Esto activa el auto-ping interno del servidor (cada 14 minutos).

