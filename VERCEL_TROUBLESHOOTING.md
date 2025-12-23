# Vercel Deployment Troubleshooting

## Issue: Seeing Raw Code "import 'expo-router/entry';"

If you see this raw code instead of your app after deploying to Vercel, it means Vercel is serving the source `index.js` file instead of the built app.

### ✅ Fix Applied

I've already fixed this by:

1. ✅ Updated `vercel.json` with proper routing configuration
2. ✅ Updated `.vercelignore` to optimize uploads

### 🔄 Redeploy to Apply Fix

**Push the changes and redeploy:**

```bash
git add vercel.json .vercelignore
git commit -m "Fix Vercel deployment configuration"
git push
```

Vercel will automatically redeploy and your app should work! 🎉

---

## Alternative Fix: Vercel Dashboard Settings

If the issue persists, try these settings in Vercel Dashboard:

### Option 1: Framework Preset

1. Go to your project in Vercel Dashboard
2. Settings → General → Framework Preset
3. Select **"Other"** or **"Vite"** (not Next.js or Node.js)
4. Save and redeploy

### Option 2: Build Settings

Manually configure build settings:

- **Framework Preset**: None / Other
- **Build Command**: `yarn export:web`
- **Output Directory**: `dist`
- **Install Command**: `yarn install`

Click **"Save"** and redeploy.

---

## Verify Build Output

Before deploying, test the build locally:

```bash
# Build the app
yarn export:web

# Check dist/ directory
ls -la dist/

# You should see:
# - index.html
# - _expo/ (folder with JS/CSS bundles)
# - assets/ (folder with images)
# - favicon.ico
```

Open `dist/index.html` in your browser to test locally.

---

## Common Issues

### Build Fails on Vercel

**Check logs for:**

- TypeScript errors → Run `yarn typecheck` locally
- Missing dependencies → Ensure `package.json` is up to date
- Environment variables → Add them in Vercel Dashboard

### App Loads But Shows Errors

- Open browser console (F12) to see errors
- Check that environment variables are set in Vercel
- Verify Stripe keys are correct (test vs. production)

### Blank White Screen

- Check browser console for JavaScript errors
- Verify the build completed successfully in Vercel logs
- Ensure `outputDirectory` is set to `dist` in Vercel settings

---

## Manual Deployment Test

Test deployment manually with Vercel CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Build locally
yarn export:web

# Deploy dist folder directly
cd dist
vercel --prod

# This will deploy ONLY the built files
```

---

## Still Having Issues?

1. Check Vercel deployment logs for errors
2. Verify `dist/index.html` exists after build
3. Try deploying with `vercel --prod` CLI
4. Contact Vercel support (they're very helpful!)

---

**Your updated configuration should work now! Just push to GitHub and Vercel will redeploy automatically.** 🚀
