# Stripe Connect Cash-Out System - Testing Guide

## 📋 Overview

This guide walks you through setting up and testing the complete Stripe Connect cash-out system in **test mode**. By the end, you'll be able to:

- Set up Stripe Connect Express accounts
- Complete bank account onboarding
- Submit cash-out requests
- Admin approve and process payouts
- Test webhook events

---

## 🚀 Step 1: Stripe Dashboard Setup

### 1.1 Enable Stripe Connect

1. Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
2. **Switch to TEST MODE** (toggle in top-right corner)
3. In left sidebar, click **"Connect"**
4. Click **"Get started"** to enable Connect
5. Under Settings → Integration:
   - Select **"Express"** as account type
   - Platform name: **"MochaLove"**

### 1.2 Get API Keys

1. Go to **Developers** → **API keys**
2. Copy these keys (test mode):
   - **Publishable key**: `pk_test_...`
   - **Secret key**: `sk_test_...` (click "Reveal")

### 1.3 Configure Webhooks

1. Go to **Developers** → **Webhooks**
2. Click **"+ Add endpoint"**
3. Endpoint URL: `https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/stripe-webhooks`
4. Description: "Cash-out payout webhooks"
5. Select events to listen for:
   - ✅ `payout.paid`
   - ✅ `payout.failed`
   - ✅ `payout.created`
   - ✅ `account.updated`
6. Click **"Add endpoint"**
7. Copy the **Webhook signing secret** (starts with `whsec_...`)

---

## 🔐 Step 2: Configure Environment Variables

### 2.1 Supabase Edge Functions Secrets

Add these secrets to your Supabase project:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Edge Functions** → **Manage secrets**
4. Add the following:

```bash
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 2.2 App Environment Variables

Already configured in your app:

```bash
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
```

---

## 📦 Step 3: Deploy Supabase Edge Functions

Deploy all the Edge Functions we created:

```bash
# Navigate to your project directory
cd /root/repos/working

# Deploy all functions
supabase functions deploy create-connect-account
supabase functions deploy create-connect-onboarding-link
supabase functions deploy get-connect-account-status
supabase functions deploy process-payout
supabase functions deploy stripe-webhooks
```

**Alternative (if you don't have Supabase CLI):**
Use the Supabase Dashboard to deploy:

1. Go to **Edge Functions** in Supabase Dashboard
2. Click **"Deploy new function"**
3. Copy/paste each function code from `supabase/functions/` directory

---

## 🗄️ Step 4: Run Database Migration

Run the SQL migration to add Stripe Connect fields:

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Click **"New query"**
3. Copy the entire contents of `supabase-stripe-connect-migration.sql`
4. Paste and click **"Run"**
5. Verify success (should see "Success. No rows returned")

This creates:

- ✅ Stripe Connect fields in `users` table
- ✅ Payout tracking fields in `cash_out_requests` table
- ✅ Admin policies and functions
- ✅ Indexes for performance

---

## 🧪 Step 5: Test the Complete Flow

### 5.1 Create Test User (Woman)

1. Open your app (as a woman user or create new account)
2. Sign up with email: `test-woman@example.com`
3. Complete profile setup
4. Make sure you have some earnings (manually update in Supabase if needed):

```sql
-- Run in Supabase SQL Editor
UPDATE users
SET earnings = 10000  -- $100.00 in cents
WHERE email = 'test-woman@example.com';
```

### 5.2 Set Up Bank Account (User Flow)

**In the app:**

1. Navigate to **Profile** → **Cash Out**
2. You should see "Set Up Bank Account" message
3. Click **"Set Up Bank Account"**
4. You'll be redirected to Stripe's onboarding page

**On Stripe onboarding page:**

1. **Business type**: Individual
2. **Email**: (pre-filled)
3. **Phone**: `000-000-0000` (test mode)
4. **Personal details**:
   - First name: `Test`
   - Last name: `User`
   - DOB: `01/01/1990`
   - SSN: `000-00-0000` (test mode only!)
   - Address: Any US address (e.g., `123 Main St, San Francisco, CA 94102`)

5. **Bank account**:
   - Routing number: `110000000`
   - Account number: `000123456789`
   - Account holder name: `Test User`

6. Click **"Submit"**
7. You'll be redirected back to the app

**Back in the app:**

8. Click **"Refresh Status"**
9. You should see **"Bank Account Verified ✅"**

### 5.3 Submit Cash-Out Request

1. Go to **Profile** → **Cash Out**
2. Enter amount: `$75.00` (must be ≥ $50)
3. You should see "Bank Account Connected ✅"
4. Click **"Request Cash Out"**
5. Confirm the alert
6. Request should be submitted successfully

### 5.4 Admin Approval (Admin Flow)

**Create admin user (if you haven't):**

```sql
-- Run in Supabase SQL Editor
UPDATE users
SET role = 'admin'
WHERE email = 'your-admin@example.com';
```

**In the app (as admin):**

1. Go to **Admin** → **Cash-Outs**
2. You should see the pending cash-out request
3. Review the details:
   - User name and email
   - Amount requested
   - Current balance
4. Click **"Approve"**
5. Confirm the approval
6. Payout should be initiated ✅

**Verify in Stripe Dashboard:**

1. Go to **Connect** → **Accounts**
2. Find the test user's account
3. Click on it
4. Go to **Payouts** tab
5. You should see the payout with status "paid" (instant in test mode)

### 5.5 Check Status Updates

**Back in user's app:**

1. Go to **Profile** → **Transaction History**
2. The cash-out should show status: **"Processing"** or **"Completed"**
3. Balance should be reduced by $75

**In Supabase:**

```sql
-- Check cash-out request status
SELECT * FROM cash_out_requests
WHERE user_id = (SELECT id FROM users WHERE email = 'test-woman@example.com')
ORDER BY created_at DESC
LIMIT 1;

-- Should show:
-- status: 'completed'
-- stripe_payout_id: 'po_xxxxx'
-- processed_at: timestamp
```

---

## 🔍 Step 6: Test Edge Cases

### 6.1 Test Insufficient Balance

1. Try to cash out more than available balance
2. Should show error: **"Insufficient balance"**

### 6.2 Test Minimum Amount

1. Try to cash out less than $50
2. Should show error: **"Minimum cashout amount is $50.00"**

### 6.3 Test Without Bank Account

1. Create a new user (no bank account setup)
2. Try to request cash-out
3. Should show alert: **"Bank Account Required"**
4. Should offer button: **"Set Up Now"**

### 6.4 Test Admin Rejection

1. Submit a cash-out request
2. As admin, click **"Reject"**
3. Enter rejection reason
4. Verify funds are returned to user's balance

### 6.5 Test Payout Failure

**Simulate failure:**

```sql
-- Manually set a request to failed
UPDATE cash_out_requests
SET status = 'failed',
    failure_reason = 'Test failure - Insufficient funds in platform account'
WHERE id = 'request-uuid';
```

**Verify:**

- User should see "Failed" status
- Admin should see failure reason
- Consider showing retry option

---

## 🎯 Step 7: Test Webhooks

### 7.1 Test Webhook Events

Stripe automatically sends webhooks in test mode, but you can manually test:

1. Go to **Stripe Dashboard** → **Developers** → **Webhooks**
2. Click on your webhook endpoint
3. Click **"Send test webhook"**
4. Select event type: `payout.paid`
5. Customize the event data (use real payout ID from your tests)
6. Click **"Send test webhook"**

**Verify webhook received:**

1. Check **Supabase Edge Functions** logs:

   ```
   supabase functions logs stripe-webhooks
   ```

2. Or check in Supabase Dashboard:
   - Go to **Edge Functions** → **stripe-webhooks** → **Logs**
   - Should see: `📨 Webhook received: payout.paid`
   - Should see: `✅ Payout paid: po_xxxxx`

### 7.2 Webhook Testing with Stripe CLI (Optional)

For real-time webhook testing:

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward events to your local Edge Function
stripe listen --forward-to https://ioscbfcleqiclevlokmo.supabase.co/functions/v1/stripe-webhooks

# Trigger test events
stripe trigger payout.paid
stripe trigger payout.failed
stripe trigger account.updated
```

---

## ✅ Testing Checklist

Use this checklist to ensure everything works:

- [ ] Stripe Connect enabled in test mode
- [ ] API keys configured in Supabase
- [ ] Webhook endpoint created and configured
- [ ] Database migration completed successfully
- [ ] All Edge Functions deployed
- [ ] User can see "Set Up Bank Account" option
- [ ] User can complete Stripe onboarding
- [ ] User can verify bank account status
- [ ] Bank account shows as "Verified" after setup
- [ ] User can submit cash-out request (≥ $50)
- [ ] Request shows in admin dashboard
- [ ] Admin can approve request
- [ ] Payout is created in Stripe
- [ ] User balance is deducted
- [ ] Status updates to "processing" then "completed"
- [ ] Transaction appears in history
- [ ] Admin can reject requests
- [ ] Rejected requests refund user balance
- [ ] Webhooks update request status
- [ ] Edge cases handled (insufficient balance, no bank, etc.)

---

## 🐛 Troubleshooting

### Issue: "Failed to create Connect account"

**Solution:**

1. Check Edge Function logs for errors
2. Verify `STRIPE_SECRET_KEY` is set correctly
3. Ensure Stripe Connect is enabled in Dashboard
4. Check that you're in test mode

### Issue: "Onboarding link not opening"

**Solution:**

1. Check browser console for errors
2. Verify the URL is valid (starts with `https://connect.stripe.com`)
3. Try copying the URL and opening in new tab
4. Check that `refresh_url` and `return_url` are valid

### Issue: "Bank account not verifying"

**Solution:**

1. In test mode, verification should be instant
2. Click "Refresh Status" button
3. Check Stripe Dashboard → Connect → Accounts
4. Verify account shows `charges_enabled: true` and `payouts_enabled: true`
5. Check for requirements in `currently_due` field

### Issue: "Webhook not received"

**Solution:**

1. Check webhook is active in Stripe Dashboard
2. Verify endpoint URL is correct
3. Check Edge Function logs for errors
4. Test webhook with "Send test webhook" in Dashboard
5. Verify `STRIPE_WEBHOOK_SECRET` matches Dashboard secret

### Issue: "Payout failed"

**Solution:**

1. Check Edge Function logs for error details
2. Verify user has verified Connect account
3. Ensure user has sufficient balance
4. Check Stripe Dashboard for payout details
5. Common test mode issues:
   - Invalid account number (use `000123456789`)
   - Invalid routing number (use `110000000`)

---

## 🌐 Testing in Different Environments

### Web (Browser)

1. Run: `npm run web` or `yarn web`
2. Open browser: `http://localhost:8081`
3. Test complete flow in browser
4. Check browser console for logs

### iOS Simulator

1. Run: `npx expo run:ios`
2. Test onboarding with `Linking.openURL()`
3. May need to handle deep linking back to app

### Android Emulator

1. Run: `npx expo run:android`
2. Test similar to iOS
3. Verify deep linking works

---

## 📊 Monitoring in Production

When ready for production:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update API keys** with live keys (`pk_live_...`, `sk_live_...`)
3. **Re-create webhook** with live webhook secret
4. **Complete Stripe verification**:
   - Provide business details
   - Add business bank account
   - Verify identity documents
5. **Monitor payouts**:
   - Stripe Dashboard → Connect → Payouts
   - Set up email notifications
   - Monitor webhook delivery

---

## 🎉 Success!

If you've completed all the steps above, your Stripe Connect cash-out system is fully functional! Users can now:

✅ Set up bank accounts securely
✅ Request cash-outs
✅ Receive payouts to their bank accounts
✅ Track status in real-time

Admins can:

✅ Review all cash-out requests
✅ Approve or reject with notes
✅ Monitor payout status
✅ Handle failures gracefully

---

## 📞 Need Help?

- **Stripe Documentation**: https://docs.stripe.com/connect
- **Supabase Docs**: https://supabase.com/docs/guides/functions
- **Stripe Support**: https://support.stripe.com
- **Test Mode Best Practices**: https://docs.stripe.com/testing

---

## 🔄 Next Steps

After successful testing:

1. **Add email notifications** for status changes
2. **Implement payout history filtering** by date range
3. **Add export to CSV** for admin reports
4. **Set up monitoring** with Stripe webhooks dashboard
5. **Create user documentation** on how to set up bank accounts
6. **Plan production launch** with gradual rollout

---

Happy testing! 🚀
