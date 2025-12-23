# Payment Troubleshooting Guide

## Issue: Coin Balance Not Updating After Payment

If your coin balance isn't updating after completing a Stripe payment, follow these steps to diagnose and fix the issue.

## Step 1: Run the Debug Tool

1. Navigate to the debug screen in your app: `/debug-payment`
2. Tap "Run Diagnostics"
3. Review the results

## Step 2: Verify Database Setup

The payment system requires the `process_coin_purchase` RPC function to exist in your Supabase database.

### Check if SQL schema was applied:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
-- Check if process_coin_purchase function exists
SELECT routine_name
FROM information_schema.routines
WHERE routine_type = 'FUNCTION'
AND routine_name = 'process_coin_purchase';
```

If this returns **no rows**, you need to apply the schema:

3. Open `/root/repos/working/supabase-payments-schema.sql`
4. Copy the entire contents
5. Paste into Supabase SQL Editor
6. Click "Run"

## Step 3: Verify Stripe Webhook Configuration

The webhook is **critical** for updating coin balances. Without it, payments will succeed but coins won't be added.

### Configure the webhook:

1. Go to [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks)
2. Click "Add endpoint"
3. Enter the endpoint URL:
   ```
   https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/stripe-webhook
   ```
4. Select events to listen for:
   - `checkout.session.completed`
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with `whsec_...`)

### Add webhook secret to Supabase:

1. Go to Supabase Dashboard → Project Settings → Edge Functions
2. Scroll to "Secrets"
3. Add new secret:
   - Name: `STRIPE_WEBHOOK_SECRET`
   - Value: `whsec_...` (the signing secret from Stripe)
4. Click "Save"

## Step 4: Verify Edge Functions Are Deployed

You need two edge functions deployed:

1. **create-checkout-session** - Creates payment session
2. **stripe-webhook** - Processes payment completion

### Check if functions are deployed:

In Supabase Dashboard → Edge Functions, you should see both functions listed.

### If not deployed, deploy them:

You need to deploy these from your local environment with Supabase CLI:

```bash
# Deploy checkout session function
supabase functions deploy create-checkout-session

# Deploy webhook function
supabase functions deploy stripe-webhook
```

## Step 5: Verify Stripe Secret Key

The edge functions need your Stripe secret key:

1. Go to Supabase Dashboard → Project Settings → Edge Functions → Secrets
2. Verify `STRIPE_SECRET_KEY` is set
3. The value should be your Stripe secret key (starts with `sk_test_...` for test mode)

### If not set:

```bash
supabase secrets set STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
```

## Step 6: Enable Realtime (Optional but Recommended)

For instant balance updates without refreshing:

1. Go to Supabase Dashboard → Database → Replication
2. Enable replication for the `users` table
3. This allows real-time subscriptions to detect coin balance changes

## Step 7: Test the Flow

1. Make a test purchase using Stripe test card: `4242 4242 4242 4242`
2. Watch the browser console for logs:
   - `🎉 Payment success detected!`
   - `🔄 Polling attempt 1/10...`
   - `💰 Current coin balance: X`
3. Coins should update within 1-3 seconds

## Step 8: Manual Verification

If you completed a payment but coins didn't update, you can manually check:

### Check if payment was recorded:

```sql
-- In Supabase SQL Editor
SELECT * FROM transactions
WHERE user_id = 'YOUR_USER_ID'
AND type = 'coin_purchase'
ORDER BY created_at DESC
LIMIT 5;
```

### Check Stripe webhook logs:

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. View "Recent events"
4. Look for `checkout.session.completed` events
5. Check if they succeeded or failed

### Check Supabase Edge Function logs:

1. Go to Supabase Dashboard → Edge Functions
2. Click on `stripe-webhook`
3. View logs
4. Look for errors or successful executions

## Common Errors and Solutions

### Error: "Function process_coin_purchase does not exist"

**Solution:** Apply the SQL schema from `supabase-payments-schema.sql`

### Error: "No signature" in webhook logs

**Solution:** Webhook secret is not configured. Add `STRIPE_WEBHOOK_SECRET` to Supabase secrets

### Error: Webhook endpoint returns 404

**Solution:** Edge function not deployed. Run `supabase functions deploy stripe-webhook`

### Coins update but with significant delay (>10 seconds)

**Possible causes:**

- Stripe webhook experiencing delays (rare)
- Supabase database under heavy load
- Network connectivity issues

**Solution:** The polling mechanism should eventually catch it. If not, check webhook logs in Stripe Dashboard.

### Real-time subscription not working

**Causes:**

- Realtime not enabled in Supabase
- Browser/firewall blocking WebSocket connections

**Solution:** Enable realtime replication for `users` table. The polling fallback will still work.

## Testing Checklist

- [ ] Database schema applied (`process_coin_purchase` exists)
- [ ] Stripe webhook configured and pointing to correct URL
- [ ] Webhook secret (`STRIPE_WEBHOOK_SECRET`) set in Supabase
- [ ] Stripe secret key (`STRIPE_SECRET_KEY`) set in Supabase
- [ ] Both edge functions deployed
- [ ] Realtime enabled (optional)
- [ ] Test purchase completed successfully
- [ ] Webhook shows "succeeded" status in Stripe Dashboard
- [ ] Coins appeared in balance within 10 seconds

## Still Not Working?

If you've verified all the above and it's still not working:

1. Run the debug tool in the app (`/debug-payment`)
2. Make a test purchase
3. Check browser console logs
4. Check Stripe webhook logs
5. Check Supabase Edge Function logs
6. Look for specific error messages

Then you can troubleshoot the specific error you're seeing.

## Quick Fix: Manual Coin Addition

If you need to manually add coins while troubleshooting:

1. Go to the debug screen (`/debug-payment`)
2. Tap "Manual Coin Test"
3. This will add 100 test coins directly to verify database write access

Or run this SQL:

```sql
UPDATE users
SET coins = coins + 100
WHERE id = 'YOUR_USER_ID';
```

---

## Architecture Overview

Here's how the payment flow works:

1. User clicks "Purchase" button
2. App calls `create-checkout-session` edge function
3. Edge function creates Stripe Checkout Session
4. User redirected to Stripe to complete payment
5. User completes payment on Stripe
6. Stripe redirects user back to app with `?payment=success`
7. **Stripe separately calls webhook** at `stripe-webhook` edge function
8. Webhook verifies signature and extracts payment details
9. Webhook calls `process_coin_purchase` RPC function
10. RPC function updates `users.coins` and creates transaction record
11. Real-time subscription in app detects coin change
12. OR polling mechanism detects coin change within 10 seconds
13. App shows success message with new balance

**The key point:** Step 7-10 (webhook processing) happens **independently** of the user's browser session. This is why proper webhook configuration is critical.
