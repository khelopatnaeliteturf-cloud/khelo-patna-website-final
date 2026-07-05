# KheloPatna WhatsApp Messaging Microservice

A standalone, decoupled microservice built with **Baileys WASocket** to handle all WhatsApp customer notifications, QR code generation, session management, and auto-response booking bots for KheloPatna.

## Features
-Decoupled WhatsApp socket session (maintains connections independently of main API crashes).
-Auto-response Interactive Booking Bot (connected directly to MongoDB).
-REST API endpoints to retrieve login QR codes, monitor state, and dispatch programmatic notifications.

## Requirements
- Node.js v18+
- MongoDB

## Setup Instructions

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Configure environment variables**:
   Create a `.env` file in the root folder (or use hosting variables) using `.env.example` as a template:
   ```env
   MONGODB_URI=your-mongodb-atlas-url
   PORT=5002
   CASHFREE_APP_ID=your-cashfree-app-id
   CASHFREE_SECRET_KEY=your-cashfree-secret-key
   CASHFREE_ENV=production
   ```

3. **Start the service**:
   - Production: `npm start`
   - Development: `npm run dev`

## API Endpoints

- **GET `/api/whatsapp/status`**: Returns current socket status (`DISCONNECTED`, `CONNECTING`, `CONNECTED`, `DISABLED`) and the current login QR code base64 data URL.
- **POST `/api/whatsapp/toggle-bot`**: Enforces auto-booking response bot toggles (`{ "enabled": true/false }`).
- **POST `/api/whatsapp/reconnect`**: Forces reconnection of closed sockets.
- **POST `/api/whatsapp/send`**: Dispatches text messages programmatically:
  ```json
  {
    "toPhone": "919999999999",
    "text": "Hello! Your booking KP-1002 is confirmed."
  }
  ```
