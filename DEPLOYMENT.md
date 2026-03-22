# EcoBuild Deployment Guide
## Free Hosting Setup

This guide shows how to deploy EcoBuild for FREE using:
- **Frontend**: Vercel (Free)
- **Backend**: Railway (Free) or Render (Free)
- **Database**: MongoDB Atlas (Free 512MB)

---

## Step 1: Set Up MongoDB Atlas (Free Database)

1. Go to [https://www.mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a new cluster (select FREE tier - M0 Sandbox)
4. Choose a region close to you
5. Click "Create Cluster"
6. Wait 3-5 minutes for cluster to be ready

### Get Connection String:
1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string
4. Replace `<username>` and `<password>` with your database credentials
5. Save this string - you'll need it for Step 2

Example: `mongodb+srv://myuser:mypass@cluster0.abc123.mongodb.net/ecobuild?retryWrites=true&w=majority`

---

## Step 2: Deploy Backend to Railway (Free)

1. Go to [https://railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Choose the `ecobuild-system/backend` folder

### Set Environment Variables in Railway:
```
MONGODB_URI = mongodb+srv://your-username:your-password@your-cluster.mongodb.net/ecobuild
PORT = 8000
JWT_SECRET_KEY = your-random-secret-key-here
CORS_ORIGINS = https://your-frontend.vercel.app
ENVIRONMENT = production
```

6. Railway will automatically deploy your backend
7. Copy the Railway app URL (e.g., `https://your-app.up.railway.app`)

---

## Step 3: Deploy Frontend to Vercel (Free)

1. Go to [https://vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "Add New..." → "Project"
4. Select your repository
5. Choose the `ecobuild-system/frontend` folder

### Set Environment Variables in Vercel:
```
REACT_APP_API_URL = https://your-backend.railway.app/api
REACT_APP_GEMINI_API_KEY = your-gemini-api-key (optional)
```

6. Click "Deploy"
7. Vercel will build and deploy your frontend
8. Copy the Vercel app URL (e.g., `https://your-app.vercel.app`)

---

## Step 4: Update Backend CORS

After getting your Vercel URL, update the backend CORS:
1. Go to Railway dashboard
2. Update `CORS_ORIGINS` to include your Vercel URL
3. Restart the backend

---

## Step 5: Seed the Database

After deployment, run the material import:
```bash
# SSH into Railway or run locally with production MONGODB_URI
python import_from_json.py
```

---

## Step 6: Verify Deployment

1. Visit your Vercel frontend URL
2. Register a new account
3. Create a project
4. Test the Material Optimizer
5. Check Reports tab

---

## Alternative: Deploy to Render (Free)

If Railway doesn't work, use Render:

1. Go to [https://render.com](https://render.com)
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Environment**: Python 3
5. Add environment variables (same as Railway)
6. Click "Create Web Service"

---

## Cost Summary

| Service | Free Tier | What You Get |
|---------|-----------|--------------|
| MongoDB Atlas | 512MB | Database for materials, users, projects |
| Railway | 500 hours/month | Backend API hosting |
| Vercel | Unlimited | Frontend hosting |
| **Total** | **$0/month** | Full app hosted for free |

---

## Troubleshooting

### Backend not connecting to MongoDB:
- Check MONGODB_URI format
- Ensure MongoDB Atlas allows connections from 0.0.0.0/0
- Check if database user has read/write permissions

### Frontend can't reach backend:
- Check REACT_APP_API_URL in Vercel
- Check CORS_ORIGINS in Railway
- Ensure both URLs are HTTPS

### App is slow:
- Railway free tier has cold starts (first request is slow)
- Consider Render or Fly.io as alternatives

---

*Last Updated: March 2026*
