-- Add payment processing tracking to subscriptions
-- Allows tracking whether payment was processed by organizer or admin account

ALTER TABLE public."organizersubscriptions"
ADD COLUMN IF NOT EXISTS "paymentProcessedBy" text DEFAULT 'organizer' CHECK ("paymentProcessedBy" IN ('organizer', 'admin'));

-- Add index for filtering admin-processed payments
CREATE INDEX IF NOT EXISTS idx_subscription_payment_processed_by
  ON public."organizersubscriptions"("paymentProcessedBy");

-- Add comment
COMMENT ON COLUMN public."organizersubscriptions"."paymentProcessedBy" IS 'Tracks which account processed the payment: "organizer" uses their HitPay credentials, "admin" uses admin fallback credentials';
