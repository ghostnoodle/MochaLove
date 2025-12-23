# Vercel Deployment Guide

This guide will help you deploy your Expo app to Vercel and get a free subdomain.

## Prerequisites

- A GitHub account
- A Vercel account (sign up at https://vercel.com - it's free!)
- Git installed locally (if deploying from your machine)

## Step 1: Push Your Code to GitHub

If you haven't already, push your code to a GitHub repository:

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - ready for deployment"

# Add your GitHub repo as remote
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push to GitHub
git push -u origin main
```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard (Recommended)

1. Go to https://vercel.com and sign in (or sign up)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect the configuration from `vercel.json`
5. **Important**: Add your environment variables:
   - Click **"Environment Variables"**
   - Add each variable:
     - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `your_stripe_key`
     - `EXPO_PUBLIC_STRIPE_TEST_MODE` = `true`
6. Click **"Deploy"**
7. Wait 2-3 minutes for the build to complete
8. Your app will be live at: `https://your-app-name.vercel.app` 🎉

### Option B: Deploy via Vercel CLI

```bash
# Install Vercel CLI globally
npm i -g vercel

# Login to Vercel
vercel login

# Deploy (first time)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? (press enter for default)
# - Directory? ./ (press enter)
# - Override settings? No

# Add environment variables
vercel env add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Paste your Stripe publishable key

vercel env add EXPO_PUBLIC_STRIPE_TEST_MODE
# Enter: true

# Deploy to production
vercel --prod
```

## Step 3: Configure Environment Variables

Your app needs these environment variables to work properly:

| Variable Name                        | Description                 | Where to Get It                      |
| ------------------------------------ | --------------------------- | ------------------------------------ |
| `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key      | https://dashboard.stripe.com/apikeys |
| `EXPO_PUBLIC_STRIPE_TEST_MODE`       | Set to `true` for test mode | Use `true` for testing               |

### Adding Environment Variables in Vercel Dashboard:

1. Go to your project in Vercel
2. Click **"Settings"** → **"Environment Variables"**
3. Add each variable for all environments (Production, Preview, Development)
4. Redeploy for changes to take effect

## Step 4: Custom Domain (Optional)

### Using Vercel's Free Subdomain

Your app is automatically deployed to: `https://your-app-name.vercel.app`

### Adding a Custom Domain

1. Buy a domain from:
   - Namecheap (~$10/year)
   - Google Domains (~$12/year)
   - GoDaddy (~$10-15/year)

2. In Vercel Dashboard:
   - Go to your project → **"Settings"** → **"Domains"**
   - Click **"Add Domain"**
   - Enter your domain (e.g., `myapp.com`)
   - Follow the DNS setup instructions
   - SSL certificate is automatically provisioned (free!)

## Build Configuration

The build is already configured via `vercel.json`:

- **Build Command**: `yarn export:web`
- **Output Directory**: `dist`
- **Framework**: Expo (detected automatically)

## Automatic Deployments

Every time you push to your main branch, Vercel will automatically:

1. Build your app
2. Run tests (if configured)
3. Deploy to production
4. Update your live site

For pull requests, Vercel creates preview deployments with unique URLs!

## Troubleshooting

### Build Fails

**Check build logs** in Vercel dashboard for errors.

Common issues:

- Missing environment variables → Add them in Vercel settings
- TypeScript errors → Run `yarn typecheck` locally first
- Dependency issues → Ensure `package.json` is up to date

### App Loads But Features Don't Work

- Check browser console for errors
- Verify environment variables are set correctly
- Make sure you're using the correct Stripe keys (test vs. production)

### Supabase Connection Issues

The Supabase credentials are hardcoded in `lib/supabase.ts`, so they should work automatically. If you want to use environment variables instead:

1. Create new environment variables in Vercel:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`

2. Update `lib/supabase.ts` to use `process.env.EXPO_PUBLIC_SUPABASE_URL`

## Production Checklist

Before going live with real users:

- [ ] Switch Stripe to **production mode**
  - Get production keys from Stripe Dashboard
  - Set `EXPO_PUBLIC_STRIPE_TEST_MODE=false`
- [ ] Update app name in `app.config.js`
- [ ] Add custom domain (optional)
- [ ] Set up analytics (optional)
- [ ] Test all features on the live site
- [ ] Update `expo-router` origin in `app.config.js` to your Vercel URL

## Updating Your Deployed App

```bash
# Make your changes locally
git add .
git commit -m "Update features"
git push

# Vercel automatically deploys! ✨
```

## Support

- Vercel Docs: https://vercel.com/docs
- Expo Docs: https://docs.expo.dev
- Stripe Docs: https://stripe.com/docs

## Your App URLs

After deployment, you'll have:

- **Production**: `https://your-app-name.vercel.app`
- **Preview** (for PRs): `https://your-app-name-git-branch-name.vercel.app`
- **Custom Domain** (if added): `https://yourdomain.com`

---

**Need help?** Check the Vercel dashboard logs or reach out to Vercel support (they're super responsive!).
