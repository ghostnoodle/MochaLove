# 🚀 Quick Start: Deploy to Vercel in 5 Minutes

## The Fastest Way to Deploy

### 1️⃣ Push to GitHub

```bash
git init
git add .
git commit -m "Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### 2️⃣ Deploy to Vercel

1. Go to **https://vercel.com** (sign up with GitHub)
2. Click **"Add New Project"**
3. Click **"Import"** next to your repository
4. Click **"Deploy"** (Vercel auto-detects everything!)

### 3️⃣ Add Environment Variables

In Vercel Dashboard → Your Project → Settings → Environment Variables:

Add these:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Get from https://dashboard.stripe.com/apikeys
- `EXPO_PUBLIC_STRIPE_TEST_MODE` = `true`

### 4️⃣ Done! 🎉

Your app is live at: `https://your-app-name.vercel.app`

---

## What We Set Up For You

✅ `vercel.json` - Vercel configuration
✅ `package.json` - Build scripts (`yarn export:web`)
✅ `.vercelignore` - Exclude unnecessary files
✅ `.env.example` - Environment variable template

## Next Steps

- **Custom Domain**: Vercel Settings → Domains → Add Domain
- **Auto Deployments**: Every `git push` automatically deploys!
- **Preview URLs**: Pull requests get their own preview URL

## Need Help?

See the full guide: `DEPLOYMENT.md`
