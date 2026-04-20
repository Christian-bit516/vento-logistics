# Vento Logistics - P2P Logistics with AI Moderation

## 🚀 Concept
Vento Logistics is a secure on-demand courier platform. It connects users with independent couriers for quick delivery of documents and small packages, featuring real-time negotiation and an advanced AI-driven security layer.

## 🧠 Key Features
- **Biometric Login**: Secure facial recognition using MediaPipe Face Mesh.
- **AI Moderation (NLP)**: Real-time chat scanning to detect camouflaged phone numbers (e.g., "nine 8 seven") and intercept potential off-platform transactions.
- **Dynamic Negotiation**: Real-time chat using Socket.io for pricing offers.
- **Fraud Control**: Persistent blacklisting system and automated interception logs.

## 🛠 Tech Stack
- **Frontend**: React 19, Vite, Tailwind CSS 4, Socket.io-client.
- **Backend**: Node.js, Express 5, Socket.io, File-based persistence.

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run the System
This will start both the Vite dev server (Frontend) and the Node.js server (Backend AI Core) concurrently.
```bash
npm start
```

### 3. Usage
1. Open `http://localhost:5173/login`.
2. Perform a **Biometric Scan** (Registration then Login).
3. Once authenticated, you will be redirected to the **Chat Platform**.
4. Try sending a message with a camouflaged phone number to see the AI in action.

## 🛡 AI Security Motor
The backend `server.js` contains the "Vento AI Core". It uses:
- **Phonetic Normalization**: Converts words like "uno", "dos" to digits.
- **Pattern Matching**: Detects sequences typical of phone numbers even with spaces or special characters.
- **Persistent Interception**: Any detected blacklisted number automatically triggers a system-wide alert and blocks the message delivery.

---
© 2026 VENTO SOFTWARE DEVELOPMENT
