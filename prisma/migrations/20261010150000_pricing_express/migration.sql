-- Add support for manually fixed sale prices and payment options in saved pricing estimates.
ALTER TABLE "PricingEstimate"
  ADD COLUMN "fixedPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "paymentOptions" JSONB;
