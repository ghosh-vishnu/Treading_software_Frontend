# Frontend (Next.js)

Next.js dashboard for OTP login/signup, trading modules, broker connect, notifications, and admin views.

## Setup (Windows / PowerShell)

```bash
cd frontend
copy .env.example .env.local
npm install
npm run dev
```

Open: `http://localhost:3000`

## Auth pages
- `/login` (OTP login)
- `/register` (OTP signup)
- `/forgot-password` (OTP reset password)

## Environment variables
See `frontend/.env.example`:
- `NEXT_PUBLIC_API_BASE_URL` (example: `http://localhost:8000/api/v1`)
- `NEXT_PUBLIC_WS_BASE_URL` (example: `ws://localhost:8000`)
