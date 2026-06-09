# Quick Start Guide

Get Pixel running in 3 commands:

## Local Development

```bash
# 1. Install dependencies (run once)
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 2. Start development servers
npm run dev

# 3. Open browser
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

## Login

```
Email: b.sepid@gmail.com
Password: Pixel2026!
```

## Test the App

1. ✅ Create a new task (click "New task" button)
2. ✅ Drag task between columns
3. ✅ Click task to open detail modal
4. ✅ Add a comment
5. ✅ Add a tag
6. ✅ Switch to List view
7. ✅ Click status dot to cycle status
8. ✅ Toggle theme (sun/moon icon)
9. ✅ Try filters (member, project, priority, search)

## What's Working

- ✅ Authentication (Supabase)
- ✅ Board view (5 columns)
- ✅ List view (table)
- ✅ Drag and drop
- ✅ Task CRUD
- ✅ Comments
- ✅ Docs
- ✅ Tags
- ✅ Real-time updates
- ✅ Dark/Light theme
- ✅ Filters and search

## Project Structure

```
backend/server.js    → API endpoints
frontend/src/App.jsx → Main app shell
frontend/src/views/  → Board and List views
```

## Common Commands

```bash
# Start dev servers
npm run dev

# Build frontend for production
npm run build

# Start backend only
cd backend && npm run dev

# Start frontend only
cd frontend && npm run dev
```

## Environment Files

Already configured:
- `backend/.env` → Supabase credentials
- `frontend/.env` → Supabase + API URL

For production, update:
- `frontend/.env.production` → Add your Railway backend URL

## Need Help?

- Full documentation: `README.md`
- Deployment steps: `DEPLOYMENT.md`
- Technical details: `IMPLEMENTATION_SUMMARY.md`

## Deploy to Production

See `DEPLOYMENT.md` for complete guide. Summary:

1. Push to GitHub
2. Deploy backend to Railway
3. Deploy frontend to Vercel
4. Update CORS settings

Takes ~30 minutes total.

---

**Ready to go!** Just run `npm run dev` and visit http://localhost:5173
