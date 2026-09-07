/**
 * The currencies a plan or promotion may be priced in.
 *
 * This is the single source of truth: the DTOs validate against
 * `SUPPORTED_CURRENCY_CODES`, and the admin console populates its currency
 * dropdown from `GET platform-admin/commercial/currencies` rather than
 * hard-coding its own list.
 *
 * Deliberately **not** every currency a payment provider anywhere could
 * theoretically bill — this list previously included EUR/GBP/ZAR/CAD/AUD,
 * none of which either hosted provider actually accepts for a subscription,
 * and one of those (GBP) is exactly how a plan ended up unbillable in
 * production once already (see docs/PAYMENTS_PLAN.md). Every code here routes
 * somewhere real via `PaymentProviderResolver`: KES/GHS/NGN/UGX/TZS/XAF/XOF to
 * IntaSend, USD to Paddle. Adding a currency to either rail is a one-line
 * change in the resolver *and* here — the two must agree, or this dropdown
 * would offer a plan that dies at checkout again.
 *
 * `minorUnits` is the number of decimal places the currency has, which is what
 * the "amount, minor units" input is counting in — 2 means the stored integer
 * is cents. It is not always 2 (JPY would be 0), so consumers must format
 * against this rather than assuming.
 */
export type SupportedCurrency = {
  code: string;
  name: string;
  minorUnits: number;
};

export const SUPPORTED_CURRENCIES: SupportedCurrency[] = [
  { code: 'USD', name: 'US Dollar', minorUnits: 2 },
  { code: 'KES', name: 'Kenyan Shilling', minorUnits: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', minorUnits: 2 },
  { code: 'NGN', name: 'Nigerian Naira', minorUnits: 2 },
  { code: 'UGX', name: 'Ugandan Shilling', minorUnits: 2 },
  { code: 'TZS', name: 'Tanzanian Shilling', minorUnits: 2 },
  { code: 'XAF', name: 'Central African CFA Franc', minorUnits: 2 },
  { code: 'XOF', name: 'West African CFA Franc', minorUnits: 2 },
  // ISO 4217 reserves XTS for testing. The sandbox plans are priced in it, so
  // it has to stay selectable or those rows become uneditable.
  { code: 'XTS', name: 'Test Currency', minorUnits: 2 },
];

export const SUPPORTED_CURRENCY_CODES: string[] = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
);
