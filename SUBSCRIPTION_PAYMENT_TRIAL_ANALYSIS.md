# Subscription Payment & Trial Logic Analysis

## Overview
Found critical subscription creation logic in `backend/controller/subscriptionController.js`. The code handles paid plan subscriptions but has a **BUG** where trial subscriptions still trigger payment initiation.

---

## Key Code Locations

### 1. **Payment Initiation Logic** 
**File:** [backend/controller/subscriptionController.js](backend/controller/subscriptionController.js#L620-L720)

#### Where Payment is Initiated:
```javascript
// Line 620-650: Get plan and calculate price
const priceAmount = billingInterval === 'yearly'
  ? Number(plan.yearlyPrice || 0)
  : Number(plan.monthlyPrice || 0);

const trialDays = Number(plan.trialDays || 0);
const trialEndDate = trialDays > 0
  ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
  : null;

// Line 638: For FREE plans, skip payment entirely
if (priceAmount === 0) {
  // Create subscription with status='active'
  // Send confirmation email
  // Return early - NO PAYMENT
  return res.status(201).json({ subscription, plan, free: true });
}

// Line 680-710: For PAID plans - THIS IS WHERE THE BUG IS
const { data: subscription, error: subError } = await supabase
  .from('organizersubscriptions')
  .insert({
    organizerId: organizer.organizerId,
    planId: planId,
    billingInterval,
    status: trialDays > 0 ? 'trial' : 'pending',  // ← Sets status to 'trial' if trialDays > 0
    priceAmount,
    currency: plan.currency || 'PHP',
    startDate: new Date().toISOString(),
    trialEndDate: trialEndDate,  // ← Sets trial end date
  })
  .select()
  .single();

// LINE 700: ALWAYS INITIATES PAYMENT - EVEN FOR TRIALS!
const payment = await createHitPayPayment(
  req, 
  priceAmount, 
  plan.currency, 
  organizer.organizerName, 
  plan.name, 
  subscription.subscriptionId
);
```

---

## The Bug: Trial Handling Issue

### Problem
When a user subscribes to a **paid plan WITH A TRIAL**:

1. ✅ Subscription is created with `status='trial'`
2. ✅ `trialEndDate` is correctly set to current_date + trialDays
3. ❌ **BUT** `createHitPayPayment()` is STILL CALLED immediately
4. ❌ A payment URL is returned to the frontend for a trial that shouldn't require payment

### Expected Behavior
```javascript
// WHAT THE CODE SHOULD DO:
if (trialDays > 0) {
  // Skip payment - just activate the trial
  await activateSubscription(subscription);
  return res.status(201).json({ 
    subscription, 
    plan, 
    trial: true, 
    message: 'Trial activated successfully' 
  });
}
// Only initiate payment if NO trial
const payment = await createHitPayPayment(...);
```

### Current Behavior (Incorrect)
```javascript
// WHAT THE CODE CURRENTLY DOES:
status: trialDays > 0 ? 'trial' : 'pending',  // Sets trial status
// ...but then immediately:
const payment = await createHitPayPayment(...);  // Initiates payment anyway!
return res.status(201).json({ subscription, paymentUrl: payment?.url });  // Returns payment URL
```

---

## Trial Days Logic - Where It's Set

### Plan Definition
**File:** [backend/controller/adminPlanController.js](backend/controller/adminPlanController.js#L78)
```javascript
const normalizedTrialDays = Math.max(0, Math.floor(toNumber(body.trialDays, 0)));

// Inserted/updated into plans table with:
trialDays: normalizedTrialDays,
```

### New Organizer Trial Assignment
**File:** [backend/controller/authController.js](backend/controller/authController.js#L124-L130)
```javascript
const trialDays = Number(defaultPlan.trialDays || 0);
const subscriptionStatus = 'free';  // Initially 'free'

if (trialDays > 0) {
  subscriptionStatus = 'trial';  // Changed to 'trial' if plan has trial days
  planExpiresAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();
}
```

---

## HitPay Payment Creation

**File:** [backend/controller/subscriptionController.js](backend/controller/subscriptionController.js#L414-L520)

```javascript
const createHitPayPayment = async (req, amount, currency, organizerName, planName, subscriptionId) => {
  console.log('[HitPay Credentials] Looking up Admin HitPay for platform subscription...');
  
  // Uses admin HitPay credentials for platform subscriptions
  const { data: adminUser } = await supabase
    .from('users')
    .select('userId')
    .eq('role', 'ADMIN')
    .limit(1)
    .maybeSingle();

  // ... fetches admin HitPay API key and salt ...
  
  // Creates payment request with amount, currency, reference_number, etc.
  const response = await fetch(`${hitPayUrl}/payment-requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-BUSINESS-API-KEY': hitPayApiKey,
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: payload.toString(),  // Includes amount
  });

  return data || {};
};
```

**Key Point:** This function doesn't know about trials - it simply creates a payment request for whatever amount is passed. **There's no trial check in this function.**

---

## Webhook Handling

**File:** [backend/controller/subscriptionController.js](backend/controller/subscriptionController.js#L750-L770)

```javascript
export const handleSubscriptionWebhook = async (req, res) => {
  try {
    const { referenceId, status } = extractSubscriptionWebhookMeta(req.body);
    
    const subscription = await fetchSubscriptionWithPlan('subscriptionId', referenceId);
    
    if (isSuccessfulPaymentStatus(status)) {
      // Activates subscription regardless of whether it was trial or paid
      await activateSubscription(subscription, req);
    } else if (isFailedPaymentStatus(status)) {
      await supabase
        .from('organizersubscriptions')
        .update({ status: 'failed' })
        .eq('subscriptionId', referenceId);
    }
  }
};
```

**Issue:** This webhook doesn't distinguish between:
- A trial subscription that shouldn't have a payment webhook fired
- A paid subscription that requires payment confirmation

---

## Trial Status Lifecycle

**File:** [backend/utils/planValidator.js](backend/utils/planValidator.js#L77)

```javascript
// Trials are treated as "live" subscriptions
const isSubscriptionLive = (
  subscriptionStatus === 'active' || 
  subscriptionStatus === 'trial' || 
  subscriptionStatus === 'free'
);
```

So trial subscriptions ARE considered "live" and active, they just shouldn't require a payment upfront.

---

## Summary of Findings

### ✅ What Works Correctly:
1. Trial days are correctly calculated from the plan (`trialDays`)
2. Trial end date is correctly computed when trials exist
3. Subscription status is correctly set to 'trial' when `trialDays > 0`
4. Trial subscriptions are treated as "live" and active in the system
5. Payment is NOT initiated for free plans (priceAmount === 0)

### ❌ What's Broken:
1. **Payment is initiated for trial subscriptions** - Line 700 always calls `createHitPayPayment()` for paid plans, ignoring trial status
2. **Trial logic is incomplete** - The code sets trial status but doesn't skip payment initiation
3. **No short-circuit for trials** - Should check `if (trialDays > 0)` and return early without calling HitPay

### 🔧 Fix Needed:
```javascript
// AFTER creating subscription with status='trial' (line 695):
if (trialDays > 0) {
  // Activate trial immediately, no payment needed
  await activateSubscription(subscription, req);
  return res.status(201).json({ 
    subscription, 
    plan, 
    trial: true,
    trialEndDate: trialEndDate 
  });
}

// ONLY reach payment creation if NO trial
const payment = await createHitPayPayment(...);
```

---

## Related Files for Reference
- **Payment Controller:** [backend/controller/paymentController.js](backend/controller/paymentController.js)
- **Order Controller:** [backend/controller/orderController.js](backend/controller/orderController.js) (handles event order payments, not subscriptions)
- **Auth Controller:** [backend/controller/authController.js](backend/controller/authController.js) (handles trial assignment on new organizer signup)
- **Admin Plan Controller:** [backend/controller/adminPlanController.js](backend/controller/adminPlanController.js) (manages plan creation/updates including trial days)
