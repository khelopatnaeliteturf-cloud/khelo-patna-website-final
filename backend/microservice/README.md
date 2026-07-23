# 📱 Standalone Baileys WhatsApp Microservice for KheloPatna

This is the official **standalone Baileys WhatsApp microservice** for KheloPatna Elite Turf.

---

## 🚀 How to Deploy on Render / Railway / VPS

### 1. Environment Variables:
Configure these environment variables in your deployment dashboard:

| Variable | Description | Example |
|---|---|---|
| `PORT` | Web server port | `3001` |
| `SUPABASE_DB_URL` | Supabase PostgreSQL connection string | `postgresql://...` |
| `MAIN_BACKEND_URL` | Main site API backend URL | `https://api.khelopatna.in` |
| `WA_API_SECRET` | Secret token to secure communication | `khelo_wa_secret_2026` |

---

### 2. Connect Main Site to Microservice:
In your main site's backend (`backend/.env`), add:

```env
WA_SERVICE_URL=https://your-whatsapp-microservice.onrender.com
WA_API_SECRET=khelo_wa_secret_2026
```

---

### 📡 API Endpoints Exposed:

- `GET /status` — Returns Baileys connection status & QR code base64 string
- `POST /send-text` — Transmits WhatsApp text message `{ "phone": "919709701400", "message": "Hi" }`
- `POST /disconnect` — Disconnects and resets session to allow QR re-pairing
