-- Add sale discount percentage column to ticketTypes table
-- Allows organizers to offer discounts on paid tickets (e.g., 50% off)

ALTER TABLE public."ticketTypes"
ADD COLUMN
IF
  NOT EXISTS "saleDiscountPercent" integer DEFAULT 0;

  -- Add index for queries
  CREATE INDEX
  IF
    NOT EXISTS idx_ticket_types_sale_discount
    ON public."ticketTypes"("saleDiscountPercent");

    -- Comment on the column
    COMMENT ON COLUMN public."ticketTypes"."saleDiscountPercent" IS 'Discount percentage for paid tickets (0-100). Final price = priceAmount * (100 - saleDiscountPercent) / 100';