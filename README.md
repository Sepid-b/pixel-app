# Pixel App - Project Management

A modern project management app with Supabase backend, Express API, and React frontend.

## Features

- 🎨 Board and List views
- 🏷️ Task management with tags, comments, and docs
- 👥 Team member assignments
- 🎯 Priority and status tracking
- 📅 Due dates and time tracking
- 🔄 Real-time updates via Supabase
- 🌓 Dark/Light theme
- 😊 Vibe strip with emoji animations
- 🎯 Drag and drop support

## Tech Stack

- **Backend**: Express.js + Supabase
- **Frontend**: React + Vite
- **Database**: PostgreSQL (Supabase)
- **Auth**: Supabase Auth
- **Styling**: Inline styles with theme system

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn

### Installation

1. Install root dependencies:
```bash
npm install
```

2. Install backend dependencies:
```bash
cd backend && npm install
```

3. Install frontend dependencies:
```bash
cd frontend && npm install
```

### Environment Variables

Backend `.env` and Frontend `.env` are already configured with Supabase credentials.

For production, update `frontend/.env.production` with your Railway backend URL.

### Development

Run both backend and frontend servers:

```bash
npm run dev
```

This will start:
- Backend API on http://localhost:3001
- Frontend dev server on http://localhost:5173

### Login Credentials

```
Email: b.sepid@gmail.com
Password: Pixel2026!
```

## Database Schema

### Tables

- `px_members` - Team members
- `px_projects` - Projects
- `px_project_members` - Project member assignments
- `px_tasks` - Tasks
- `px_tags` - Tag definitions
- `px_task_tags` - Task tag assignments
- `px_task_comments` - Task comments
- `px_docs` - Task documentation links
- `px_time_entries` - Time tracking
- `px_standups` - Daily standups
- `px_activity_log` - Activity history

### Supabase Details

- **Project**: pixel
- **URL**: https://ajlpwtqopoxarmeshztj.supabase.co
- **Region**: us-east-1

## Building for Production

Build the frontend:

```bash
cd frontend
npm run build
```

The build output will be in `frontend/dist/`.

## Deployment

### Backend (Railway)

1. Create new Railway project
2. Set root directory: `backend`
3. Start command: `node server.js`
4. Environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `PORT` (Railway sets this automatically)

### Frontend (Vercel)

1. Create new Vercel project
2. Root directory: `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_API_URL` (Your Railway backend URL)

### Post-Deployment

Update backend CORS settings in `server.js` to include your Vercel domain.

## Project Structure

```
pixel-app/
├── backend/
│   ├── server.js          # Express API server
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── App.jsx        # Main app component
│   │   ├── Login.jsx      # Login screen
│   │   ├── api.js         # API client
│   │   ├── supabaseClient.js
│   │   ├── main.jsx       # Entry point
│   │   └── views/
│   │       ├── BoardView.jsx  # Kanban board
│   │       └── ListView.jsx   # Table view
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env
├── package.json          # Root package (runs both servers)
└── README.md
```

## Default Tags

- design (pink)
- feedback (orange)
- urgent (red)
- review-needed (blue)
- waiting-for-client (gray)
- quick-win (green)

## Key Features Explained

### Vibe Strip
The top navigation shows team member avatars that cycle between showing the member's initial and their mood emoji every 4.5 seconds.

Mood scale:
- 1: 😩 (Struggling)
- 2: 😔 (Not great)
- 3: 😐 (Okay)
- 4: 😊 (Good)
- 5: 🔥 (On fire)

### Drag and Drop
Tasks can be dragged between columns in Board view. The position is automatically updated in the database.

### Real-time Updates
Tasks update across all connected clients in real-time using Supabase's real-time subscriptions.

### Theme System
Toggle between dark and light themes using the sun/moon icon in the top nav. Theme preferences are stored locally.

## License

Private project - All rights reserved
