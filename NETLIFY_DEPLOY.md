# 🚀 Netlify Deployment Guide - Super Easy!

Netlify is easier than Vercel and gives you a free subdomain: `your-app-name.netlify.app`

---

## 🎯 **Option 1: Netlify Drop (Easiest - No Git Required!)**

### Deploy in 3 Steps:

1. **Build your app:**

   ```bash
   yarn export:web
   ```

2. **Go to Netlify Drop:**
   - Visit: https://app.netlify.com/drop
   - Sign up/login (free account)

3. **Drag & Drop:**
   - Drag your `dist` folder into the browser
   - **Done!** You get a live URL instantly 🎉

**Your app is live at**: `https://random-name-12345.netlify.app`

### To Update:

Just rebuild (`yarn export:web`) and drag the `dist` folder again!

---

## 🔗 **Option 2: Connect to GitHub (Auto-Deploy)**

This is better for long-term projects - automatic deployments on every push!

### Step 1: Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "Configure Netlify deployment"

# Push to GitHub
git push
```

### Step 2: Deploy on Netlify

1. Go to https://app.netlify.com
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"GitHub"** and authorize
4. Select your repository
5. Netlify auto-detects settings from `netlify.toml`:
   - **Build command**: `yarn export:web` ✅ (auto-filled)
   - **Publish directory**: `dist` ✅ (auto-filled)
6. Click **"Deploy site"**

**Wait 2-3 minutes** and your app is live! 🚀

### Step 3: Add Environment Variables

1. Go to **Site settings** → **Environment variables**
2. Click **"Add a variable"** → **"Add a single variable"**
3. Add these:

**Variable 1:**

- Key: `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- Value: Your Stripe key from https://dashboard.stripe.com/apikeys
- Scopes: Select all (Builds, Functions, Post processing)

**Variable 2:**

- Key: `EXPO_PUBLIC_STRIPE_TEST_MODE`
- Value: `true`
- Scopes: Select all

4. Click **"Trigger deploy"** to rebuild with environment variables

---

## 🎁 **Option 3: Netlify CLI (For Developers)**

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Build
yarn export:web

# Deploy to draft URL (for testing)
netlify deploy

# Deploy to production
netlify deploy --prod
```

---

## 🎨 Customize Your URL

Free options:

### Change Site Name:

1. Go to **Site settings** → **General** → **Site details**
2. Click **"Change site name"**
3. Enter: `my-awesome-app`
4. Your URL becomes: `https://my-awesome-app.netlify.app`

### Add Custom Domain:

1. Buy a domain ($10-15/year from Namecheap, Google, etc.)
2. Go to **Site settings** → **Domain management**
3. Click **"Add custom domain"**
4. Follow DNS instructions
5. Free SSL automatically added!

---

## ⚡ Automatic Deployments

Once connected to GitHub:

- Every `git push` → Automatic deploy
- Pull requests → Get preview URLs
- See build logs in real-time

---

## 🔍 What We Set Up For You

✅ `netlify.toml` - Netlify configuration
✅ Build command: `yarn export:web`
✅ Output directory: `dist`
✅ Automatic redirects for single-page app
✅ Security headers
✅ Cache optimization for assets

---

## 📊 Netlify vs Vercel

| Feature              | Netlify           | Vercel        |
| -------------------- | ----------------- | ------------- |
| **Setup Difficulty** | ⭐⭐⭐⭐⭐ Easier | ⭐⭐⭐ Medium |
| **Drag & Drop**      | ✅ Yes            | ❌ No         |
| **Free Subdomain**   | `.netlify.app`    | `.vercel.app` |
| **Auto Deploy**      | ✅ Yes            | ✅ Yes        |
| **Build Speed**      | Fast              | Fast          |
| **Bandwidth**        | 100GB/month       | 100GB/month   |

---

## 🎯 Quick Start Summary

**Fastest way (2 minutes):**

```bash
yarn export:web
```

Then drag `dist` folder to https://app.netlify.com/drop

**Best way (5 minutes):**

1. Push to GitHub
2. Import in Netlify
3. Add environment variables
4. Done!

---

## 🆘 Troubleshooting

### Build Fails

- Check build logs in Netlify dashboard
- Run `yarn typecheck` locally to catch TypeScript errors
- Ensure environment variables are added

### Blank Screen

- Open browser console (F12) to see errors
- Check that environment variables are set correctly
- Verify build completed successfully

### Need to Rebuild

- Go to **Deploys** tab
- Click **"Trigger deploy"** → **"Deploy site"**

---

## 📱 What You Get Free

- ✅ Free subdomain: `your-app.netlify.app`
- ✅ Automatic SSL (HTTPS)
- ✅ Global CDN
- ✅ 100GB bandwidth/month
- ✅ Instant cache invalidation
- ✅ Deploy previews for PRs
- ✅ Unlimited sites

---

**Your app is ready to deploy! Choose Option 1 (Drag & Drop) for instant results, or Option 2 (GitHub) for automatic deployments.** 🚀
