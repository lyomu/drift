/**
 * The currencies a plan or promotion may be priced in.
 *
 * This is the single source of truth: the DTOs validate against
 * `SUPPORTED_CURRENCY_CODES`, and the admin console populates its currency
 * dropdown from `GET platform-admin/commercial/currencies` rather than
 * hard-coding its own list. Adding a currency is a one-line change here.
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
  { code: 'EUR', name: 'Euro', minorUnits: 2 },
  { code: 'GBP', name: 'Pound Sterling', minorUnits: 2 },
  { code: 'NGN', name: 'Nigerian Naira', minorUnits: 2 },
  { code: 'ZAR', name: 'South African Rand', minorUnits: 2 },
  { code: 'KES', name: 'Kenyan Shilling', minorUnits: 2 },
  { code: 'GHS', name: 'Ghanaian Cedi', minorUnits: 2 },
  { code: 'CAD', name: 'Canadian Dollar', minorUnits: 2 },
  { code: 'AUD', name: 'Australian Dollar', minorUnits: 2 },
  // ISO 4217 reserves XTS for testing. The sandbox plans are priced in it, so
  // it has to stay selectable or those rows become uneditable.
  { code: 'XTS', name: 'Test Currency', minorUnits: 2 },
];

export const SUPPORTED_CURRENCY_CODES: string[] = SUPPORTED_CURRENCIES.map(
  (currency) => currency.code,
);
