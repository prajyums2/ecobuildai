# EcoBuild Deployment Guide (Quick Setup)
## New Railway Account + Vercel

---

## Step 1: Deploy Backend to Railway (New Account)

1. Go to [railway.app](https://railway.app)
2. Sign up with **GitHub** (use new account)
3. Click **"New Project"** → **"Deploy from GitHub repo"**
4. Select `prajyums2/ecobuildai`
5. Set **Root Directory**: `ecobuild-system/backend`

### Add Environment Variables in Railway:
Go to **Variables** tab and add:
```
MONGODB_URI=mongodb+srv://prajyuAdmin:YN5nmRHhnx4bgwfE@ecobuild.bvpycnv.mongodb.net/ecobuild?retryWrites=true&w=majority&appName=ecobuild
PORT=8000
JWT_SECRET_KEY=ecobuild-secret-key-2026
CORS_ORIGINS=*
ENVIRONMENT=production
```

### Set Start Command in Settings:
```
uvicorn main:app --host 0.0.0.0 --port $PORT
```

6. Deploy and copy the new URL (e.g., `https://ecobuildai-production.up.railway.app`)

---

## Step 2: Update Frontend with New Backend URL

1. Edit `ecobuild-system/frontend/.env`:
```
REACT_APP_API_URL=https://YOUR_NEW_RAILWAY_URL/api
```

2. Commit and push:
```bash
git add -A
git commit -m "Update API URL"
git push origin main
```

---

## Step 3: Redeploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com)
2. Find your `ecobuildai` project
3. Go to **Settings** → **Environment Variables**
4. Update `REACT_APP_API_URL` with new Railway URL
5. Go to **Deployments** → Click **Redeploy** on latest deployment

---

## Environment Variables Reference

### Railway (Backend):
```
MONGODB_URI=mongodb+srv://prajyuAdmin:YN5nmRHhnx4bgwfE@ecobuild.bvpycnv.mongodb.net/ecobuild?retryWrites=true&w=majority&appName=ecobuild
PORT=8000
JWT_SECRET_KEY=ecobuild-secret-key-2026
CORS_ORIGINS=*
ENVIRONMENT=production
```

### Vercel (Frontend):
```
REACT_APP_API_URL=https://YOUR_RAILWAY_URL/api
```

---

## After Deployment

1. Test backend: `https://YOUR_RAILWAY_URL/health`
2. Test frontend: `https://ecobuildai.vercel.app`
3. Test registration: Try creating an account

---

## MongoDB Atlas Connection:
- Username: `prajyuAdmin`
- Password: `YN5nmRHhnx4bgwfE`
- Cluster: `ecobuild.bvpycnv.mongodb.net`
- Database: `ecobuild`

---

*Last Updated: March 2026*
