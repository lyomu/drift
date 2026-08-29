import { PaymentMethodType } from '@prisma/client';
import { SandboxPaymentProvider } from './sandbox-payment.provider';

describe('SandboxPaymentProvider', () => {
  const provider = new SandboxPaymentProvider();

  describe('createPaymentMethod', () => {
    it('labels a card with its brand and last four', async () => {
      const method = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: 'Visa',
        last4: '4242',
      });

      expect(method.provider).toBe('SANDBOX');
      expect(method.brand).toBe('Visa');
      expect(method.label).toBe('Visa ending 4242');
    });

    it('falls back to a generic brand when none is given', async () => {
      const method = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: '   ',
        last4: '4242',
      });
      expect(method.brand).toBe('Card');
    });

    it('always labels mobile money as such, ignoring any supplied brand', async () => {
      const method = await provider.createPaymentMethod({
        type: PaymentMethodType.MOBILE_MONEY,
        brand: 'Visa',
        last4: '1234',
      });
      expect(method.brand).toBe('Mobile money');
    });

    it('encodes the deterministic decline path in the token', async () => {
      const declining = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: 'Visa',
        last4: '0000',
      });
      const approving = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: 'Visa',
        last4: '4242',
      });

      expect(declining.token).toContain('_decline_');
      expect(approving.token).toContain('_approve_');
    });

    it('issues a distinct token per method', async () => {
      const a = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: 'Visa',
        last4: '4242',
      });
      const b = await provider.createPaymentMethod({
        type: PaymentMethodType.CARD,
        brand: 'Visa',
        last4: '4242',
      });
      expect(a.token).not.toBe(b.token);
    });
  });

  describe('charge', () => {
    it('succeeds for an approving token', async () => {
      const result = await provider.charge({
        providerToken: 'sandbox_pm_approve_abc',
      });
      expect(result.succeeded).toBe(true);
      expect(result.failureReason).toBeNull();
    });

    it('declines a declining token with a specific, actionable reason', async () => {
      const result = await provider.charge({
        providerToken: 'sandbox_pm_decline_abc',
      });
      expect(result.succeeded).toBe(false);
      // The clients surface this verbatim, so it has to tell the user what
      // to do next rather than just that something failed.
      expect(result.failureReason).toMatch(/another method/i);
    });

    it('returns a reference for both outcomes so a failure is still traceable', async () => {
      const declined = await provider.charge({
        providerToken: 'sandbox_pm_decline_abc',
      });
      expect(declined.reference).toMatch(/^sandbox_tx_/);
    });
  });
});
