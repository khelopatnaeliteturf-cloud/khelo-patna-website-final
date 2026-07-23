# ⚽ KheloPatna Standalone Baileys WhatsApp Microservice

A dedicated, lightweight, high-performance Node.js microservice for handling **WhatsApp messaging & auto-replies** using `@whiskeysockets/baileys` and **Supabase PostgreSQL**.

---

## 📁 Repository Structure

```
khelo-patna-whatsapp-microservice/
├── index.js          # Express API & Baileys socket engine
├── package.json      # Node dependencies
├── .env.example      # Environment variable template
├── .gitignore        # Git ignore rules
└── README.md         # Deployment & API guide
```

---

## ⚙️ Environment Variables Config

Create a `.env` file or add these environment variables to Render / Railway / Docker / VPS:

| Variable | Required | Description | Example |
|---|---|---|---|
| `PORT` | Optional | Web server port (defaults to 3001) | `3001` or `10000` |
| `SUPABASE_DB_URL` | **Yes** | Supabase PostgreSQL Connection String | `postgresql://postgres...` |
| `MAIN_BACKEND_URL` | **Yes** | Main KheloPatna website backend URL | `https://api.khelopatna.in` |
| `WA_API_SECRET` | **Yes** | Secret token for securing endpoints & webhooks | `khelo_wa_secret_2026` |

---

## 🚀 Deployment Instructions (Render / Railway / VPS)

### Option A: Render (Free Web Service)
1. Push this folder to GitHub as a standalone repo or select this subfolder.
2. In Render Dashboard, click **New +** -> **Web Service**.
3. Set **Build Command**: `npm install`
4. Set **Start Command**: `npm start`
5. Add your Environment Variables (`SUPABASE_DB_URL`, `MAIN_BACKEND_URL`, `WA_API_SECRET`).
6. Click **Deploy Web Service**!

---

## 🔌 Connecting Main KheloPatna Website

In your main website's backend project (`backend/.env`), add:

```env
WA_SERVICE_URL=https://your-microservice-name.onrender.com
WA_API_SECRET=khelo_wa_secret_2026
```

---

## 📡 API Reference

### `GET /status`
Header: `X-WA-Secret: <WA_API_SECRET>`
Returns connection status and QR code base64 image string.

### `POST /send-text`
Header: `X-WA-Secret: <WA_API_SECRET>`
Body:
```json
{
  "phone": "919709701400",
  "message": "Your turf booking is confirmed!"
}
```

### `POST /disconnect`
Header: `X-WA-Secret: <WA_API_SECRET>`
Wipes session from PostgreSQL database and generates a fresh QR code.
