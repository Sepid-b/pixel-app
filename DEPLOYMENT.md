# Deployment Guide

## Overview

This guide covers deploying Pixel app to production:
- Backend → Railway
- Frontend → Vercel

## Prerequisites

- GitHub account (to push code)
- Railway account
- Vercel account

## Step 1: Push to GitHub

1. Create a new repository on GitHub (e.g., `pixel-app`)
2. Don't initialize with README (we already have one)
3. Push your local repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/pixel-app.git
git branch -M main
git push -u origin main
```

## Step 2: Deploy Backend to Railway

### Option A: Using Railway CLI

1. Install Railway CLI:
```bash
npm i -g @railway/cli
```

2. Login and deploy:
```bash
cd backend
railway login
railway init
railway up
```

3. Add environment variables in Railway dashboard:
   - `SUPABASE_URL`: https://ajlpwtqopoxarmeshztj.supabase.co
   - `SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbHB3dHFvcG94YXJtZXNoenRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzIyNTksImV4cCI6MjA5NjU0ODI1OX0.njlNfcb7sKKq2x2ezfmgPUeIfBOFvi9SRJZBPYnLMhU
   - `PORT`: (Railway sets automatically, no need to configure)

### Option B: Using Railway Dashboard

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select your `pixel-app` repository
4. Configure:
   - **Root Directory**: `backend`
   - **Start Command**: `node server.js`
5. Add environment variables (Settings → Variables):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
6. Click "Deploy"
7. Once deployed, copy the Railway URL (e.g., `https://pixel-backend.railway.app`)

### Update CORS

After deployment, update `backend/server.js` to allow your Vercel domain:

```javascript
app.use(cors({
  origin: ['http://localhost:5173', 'https://your-vercel-app.vercel.app']
}));
```

Commit and push the change:
```bash
git add backend/server.js
git commit -m "Update CORS for production"
git push
```

Railway will auto-deploy the update.

## Step 3: Deploy Frontend to Vercel

### Option A: Using Vercel CLI

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd frontend
vercel
```

3. Follow the prompts:
   - Link to existing project? **N**
   - What's your project name? **pixel-app**
   - In which directory is your code located? **./**
   - Want to override settings? **Y**
   - Build Command: **npm run build**
   - Output Directory: **dist**
   - Development Command: **npm run dev**

4. Add environment variables:
```bash
vercel env add VITE_SUPABASE_URL
# Enter: https://ajlpwtqopoxarmeshztj.supabase.co

vercel env add VITE_SUPABASE_ANON_KEY
# Enter: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbHB3dHFvcG94YXJtZXNoenRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzIyNTksImV4cCI6MjA5NjU0ODI1OX0.njlNfcb7sKKq2x2ezfmgPUeIfBOFvi9SRJZBPYnLMhU

vercel env add VITE_API_URL
# Enter: https://your-railway-backend.railway.app
```

5. Deploy to production:
```bash
vercel --prod
```

### Option B: Using Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Click "New Project"
3. Import your `pixel-app` GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Add environment variables:
   - `VITE_SUPABASE_URL`: https://ajlpwtqopoxarmeshztj.supabase.co
   - `VITE_SUPABASE_ANON_KEY`: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFqbHB3dHFvcG94YXJtZXNoenRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA5NzIyNTksImV4cCI6MjA5NjU0ODI1OX0.njlNfcb7sKKq2x2ezfmgPUeIfBOFvi9SRJZBPYnLMhU
   - `VITE_API_URL`: (Your Railway backend URL)
6. Click "Deploy"

## Step 4: Verify Deployment

1. Visit your Vercel URL
2. Login with:
   - Email: b.sepid@gmail.com
   - Password: Pixel2026!
3. Test key features:
   - ✅ Create a task
   - ✅ Drag and drop between columns
   - ✅ Add comments to a task
   - ✅ Toggle task status in list view
   - ✅ Filter by member/project/priority
   - ✅ Theme toggle
   - ✅ Real-time updates (open in two tabs)

## Troubleshooting

### Backend Issues

**CORS errors:**
- Make sure you updated the CORS configuration in `backend/server.js`
- Add your Vercel domain to the allowed origins

**Database connection:**
- Verify `SUPABASE_URL` and `SUPABASE_ANON_KEY` are set correctly in Railway
- Check Railway logs for connection errors

### Frontend Issues

**API connection fails:**
- Verify `VITE_API_URL` points to your Railway backend
- Check browser console for CORS errors
- Ensure Railway backend is running (check Railway logs)

**Environment variables not working:**
- Remember that Vite env vars must start with `VITE_`
- After changing env vars in Vercel, trigger a new deployment

**Build fails:**
- Check Vercel build logs
- Verify all dependencies are in `package.json`
- Try building locally first: `npm run build`

## Continuous Deployment

Both Railway and Vercel are now set up for continuous deployment:

- **Railway**: Automatically deploys backend on push to `main` branch
- **Vercel**: Automatically deploys frontend on push to `main` branch

To deploy changes:
```bash
git add .
git commit -m "Your commit message"
git push
```

## Custom Domain (Optional)

### Vercel

1. Go to Project Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed

### Railway

1. Go to Project → Settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed
4. Update `VITE_API_URL` in Vercel to use new backend domain

## Security Notes

- Never commit `.env` files
- Rotate Supabase keys if accidentally exposed
- Enable RLS policies on Supabase tables for production
- Consider rate limiting on Railway backend
- Use environment-specific keys for production

## Cost Estimates

- **Supabase**: Free tier (up to 500MB database, 2GB bandwidth)
- **Railway**: Free $5 credit/month, then ~$5-20/month
- **Vercel**: Free tier (100GB bandwidth, unlimited deployments)

Total estimated cost: $0-20/month depending on usage.

## Support

For issues:
1. Check Railway/Vercel logs
2. Verify environment variables
3. Test API endpoints directly (Postman/curl)
4. Check Supabase dashboard for database issues
