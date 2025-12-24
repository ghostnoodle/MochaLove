# ⚡ Netlify Quick Start - Deploy in 2 Minutes!

## 🎯 **Super Fast Method (Drag & Drop)**

No GitHub, no CLI, no configuration needed!

### 1️⃣ Build Your App

```bash
yarn export:web
```

### 2️⃣ Deploy

1. Go to: **https://app.netlify.com/drop**
2. Sign up/login (free)
3. **Drag the `dist` folder** into the browser
4. **Done!** 🎉

Your app is live at: `https://random-name-12345.netlify.app`

---

## 🔄 **For Automatic Deployments (Connect GitHub)**

### 1️⃣ Push to GitHub

```bash
git add .
git commit -m "Add Netlify configuration"
git push
```

### 2️⃣ Import to Netlify

1. Go to **https://app.netlify.com**
2. Click **"Add new site"** → **"Import from GitHub"**
3. Choose your repository
4. Click **"Deploy"** (settings auto-detected from `netlify.toml`)

### 3️⃣ Add Environment Variables

In Netlify Dashboard → **Site settings** → **Environment variables**:

Add these:

- `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = Your Stripe key
- `EXPO_PUBLIC_STRIPE_TEST_MODE` = `true`

Then click **"Trigger deploy"**

---

## 🎨 Customize Your URL

1. **Site settings** → **Site details** → **Change site name**
2. Enter your name: `my-app`
3. Your URL: `https://my-app.netlify.app` ✨

---

## ✅ What We Set Up

✅ `netlify.toml` - All configuration done
✅ Build command: `yarn export:web`
✅ Output: `dist` folder
✅ Auto-redirects for single-page app
✅ Security headers

---

## 📚 Full Guide

See `NETLIFY_DEPLOY.md` for detailed instructions.

---

**That's it! Netlify is the easiest way to deploy your Expo app.** 🚀
