# 🧪 Stripe Test Mode Quick Start

This guide will get you testing Stripe payments in **5 minutes** using Stripe's sandbox/test mode.

---

## Step 1: Get Your Stripe Test Keys (2 minutes)

1. **Sign up for Stripe** (if you haven't):
   - Go to https://dashboard.stripe.com/register
   - Complete the signup

2. **Get Your Test API Keys**:
   - Go to https://dashboard.stripe.com/test/apikeys
   - Make sure you're in **"Test mode"** (toggle in top right)
   - Copy these two keys:
     - **Publishable key** (starts with `pk_test_`)
     - **Secret key** (starts with `sk_test_` - click "Reveal test key")

---

## Step 2: Add Environment Variables (1 minute)

### In Draftbit:

Since you're using Draftbit, I need to use their environment variable tools:

1. Use the MCP tool to list current environment variables:

```
Check what environment variables exist
```

2. Add the Stripe publishable key:

```
Add EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY with your pk_test_ key
```

3. Add test mode flag:

```
Add EXPO_PUBLIC_STRIPE_TEST_MODE set to true
```

---

## Step 3: Deploy Supabase Edge Function (2 minutes)

**Option A: Using Supabase Dashboard (Easiest)**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Go to **Edge Functions** in the left sidebar
4. Click **"Create a new function"**
5. Name it: `create-payment-intent`
6. Paste the code from `/supabase/functions/create-payment-intent/index.ts`
7. Click **"Deploy"**
8. Go to **Settings** → **Edge Function Secrets**
9. Add secret: `STRIPE_SECRET_KEY` = your `sk_test_...` key

**Option B: Using Supabase CLI**

```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Login
supabase login

# Link your project
supabase link --project-ref YOUR_PROJECT_REF

# Set secret key
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE

# Deploy function
cd /root/repos/working
supabase functions deploy create-payment-intent
```

---

## Step 4: Test Payments! 🎉

### Test Card Numbers (Stripe Sandbox):

Use these **test card numbers** - they won't charge real money:

#### ✅ **Successful Payment:**

- **Card:** `4242 4242 4242 4242`
- **Expiry:** Any future date (e.g., `12/25`)
- **CVC:** Any 3 digits (e.g., `123`)
- **ZIP:** Any 5 digits (e.g., `12345`)

#### ❌ **Declined Payment:**

- **Card:** `4000 0000 0000 0002`
- Use same expiry/CVC as above

#### 🔐 **Requires 3D Secure (testing authentication):**

- **Card:** `4000 0025 0000 3155`
- Will prompt for authentication challenge

#### 💳 **More Test Cards:**

- See all test cards: https://stripe.com/docs/testing#cards

### Test Flow:

1. **Restart your app** (to load new environment variables)
2. Go to the **Shop** tab
3. Select any coin package
4. Use test card: `4242 4242 4242 4242`
5. Complete payment
6. ✅ Coins should be added to your balance!

---

## Step 5: View Test Payments in Stripe

1. Go to https://dashboard.stripe.com/test/payments
2. You'll see all test payments
3. Click on any payment to see details
4. Check payment status, amount, metadata

---

## 🚨 Common Issues & Fixes

### "Stripe publishable key is missing"

**Fix:** Restart the Expo development server after adding environment variables

### "Payment Intent creation failed"

**Fix:**

1. Verify Edge Function is deployed
2. Check that `STRIPE_SECRET_KEY` is set in Supabase secrets
3. View Edge Function logs: Supabase Dashboard → Edge Functions → Logs

### "Payment succeeds but coins don't update"

**Fix:**

1. Check that you ran the `/supabase-payments-schema.sql` in Supabase SQL Editor
2. Verify the `process_coin_purchase()` function exists

### App not recognizing environment variables

**Fix:**

1. In Draftbit, make sure variables start with `EXPO_PUBLIC_`
2. Reload the app completely (not just refresh)
3. Check that variables are in the correct environment (Development/Staging/Production)

---

## 📊 What You Can Test

✅ **Coin Purchases:**

- Different package amounts
- Success and decline scenarios
- 3D Secure authentication
- Multiple purchases

✅ **Transaction History:**

- Go to Profile → Transaction History
- See all test purchases

✅ **Balance Updates:**

- Watch coin balance increase after purchase
- Check Balance/Earnings tab

❌ **Cannot Test (requires production):**

- Real money transactions
- Apple Pay (needs Apple Developer account)
- Google Pay (needs Google Play Console)
- Cash-outs (requires Stripe Connect setup)

---

## 🎯 Quick Test Checklist

- [ ] Stripe test keys obtained
- [ ] Environment variables added in Draftbit
- [ ] Edge Function deployed to Supabase
- [ ] Test payment with 4242... succeeds
- [ ] Coins added to account
- [ ] Transaction appears in history
- [ ] Test decline with 0002... card works

---

## 🔄 Switch to Production Later

When ready for real money:

1. **Activate Stripe account** (verify business)
2. Switch Stripe dashboard to **Live mode**
3. Get **Live keys** (pk*live* and sk*live*)
4. Update environment variables:
   - `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...`
   - `EXPO_PUBLIC_STRIPE_TEST_MODE=false`
5. Update Supabase secret:
   - `STRIPE_SECRET_KEY=sk_live_...`

---

## 💡 Pro Tips

- **Keep test mode on** until app is fully tested
- **Never commit secret keys** to git
- **Test failure scenarios** (declined cards, expired cards)
- **Check Stripe Dashboard** after each test payment
- **Use webhooks** for production (handles edge cases)

---

## 📚 Resources

- **Stripe Test Mode:** https://stripe.com/docs/testing
- **Test Cards:** https://stripe.com/docs/testing#cards
- **Full Setup Guide:** See `STRIPE_SETUP.md`
- **Payment Intents API:** https://stripe.com/docs/payments/payment-intents

---

## ✅ You're Ready to Test!

Now you can:

1. Test coin purchases with fake cards
2. View payments in Stripe Dashboard
3. Verify coins are added correctly
4. Test decline scenarios

**No real money will be charged in test mode!** 🎉
