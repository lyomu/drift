import { ServiceUnavailableException } from '@nestjs/common';
import { PaymentProviderResolver } from './payment-provider.resolver';
import type { IntasendPaymentProvider } from './intasend-payment.provider';
import type { PaddlePaymentProvider } from './paddle-payment.provider';
import type { SandboxPaymentProvider } from './sandbox-payment.provider';

function fakeIntasend(enabled: boolean): IntasendPaymentProvider {
  return {
    mode: 'hosted',
    name: 'INTASEND',
    enabled,
    cancelSubscription: jest.fn(),
  } as unknown as IntasendPaymentProvider;
}

function fakePaddle(enabled: boolean): PaddlePaymentProvider {
  return {
    mode: 'hosted',
    name: 'PADDLE',
    enabled,
    cancelSubscription: jest.fn(),
  } as unknown as PaddlePaymentProvider;
}

function fakeSandbox(): SandboxPaymentProvider {
  return {
    mode: 'direct',
    name: 'SANDBOX',
  } as unknown as SandboxPaymentProvider;
}

describe('PaymentProviderResolver', () => {
  it('falls back to sandbox for every currency when nothing real is configured', () => {
    const sandbox = fakeSandbox();
    const resolver = new PaymentProviderResolver(
      fakeIntasend(false),
      fakePaddle(false),
      sandbox,
    );

    expect(resolver.resolve('KES')).toBe(sandbox);
    expect(resolver.resolve('USD')).toBe(sandbox);
    expect(resolver.resolve('XTS')).toBe(sandbox);
    expect(resolver.liveConfigured).toBe(false);
  });

  it('routes IntaSend-supported currencies to IntaSend once configured', () => {
    const intasend = fakeIntasend(true);
    const resolver = new PaymentProviderResolver(
      intasend,
      fakePaddle(false),
      fakeSandbox(),
    );

    for (const currency of ['KES', 'GHS', 'NGN', 'UGX', 'TZS', 'XAF', 'XOF']) {
      expect(resolver.resolve(currency)).toBe(intasend);
    }
  });

  it('routes USD to Paddle once configured', () => {
    const paddle = fakePaddle(true);
    const resolver = new PaymentProviderResolver(
      fakeIntasend(false),
      paddle,
      fakeSandbox(),
    );

    expect(resolver.resolve('USD')).toBe(paddle);
  });

  it('does not route USD to IntaSend just because IntaSend is configured', () => {
    const resolver = new PaymentProviderResolver(
      fakeIntasend(true),
      fakePaddle(false),
      fakeSandbox(),
    );

    expect(resolver.resolve('USD')).toBeNull();
  });

  it('refuses an unroutable currency once anything real is configured, rather than silently charging through the sandbox', () => {
    const resolver = new PaymentProviderResolver(
      fakeIntasend(true),
      fakePaddle(false),
      fakeSandbox(),
    );

    expect(resolver.resolve('XTS')).toBeNull();
    expect(() => resolver.require('XTS')).toThrow(ServiceUnavailableException);
  });

  it('isHosted reflects the resolved provider’s mode, and is false for an unroutable currency', () => {
    const resolver = new PaymentProviderResolver(
      fakeIntasend(true),
      fakePaddle(false),
      fakeSandbox(),
    );

    expect(resolver.isHosted('KES')).toBe(true);
    expect(resolver.isHosted('XTS')).toBe(false);
  });

  it('isHosted is false in the sandbox-only fallback, even for a currency that would otherwise be hosted', () => {
    const resolver = new PaymentProviderResolver(
      fakeIntasend(false),
      fakePaddle(false),
      fakeSandbox(),
    );

    expect(resolver.isHosted('KES')).toBe(false);
  });

  it('byName finds a provider by its own name, and only that one', () => {
    const intasend = fakeIntasend(true);
    const paddle = fakePaddle(true);
    const sandbox = fakeSandbox();
    const resolver = new PaymentProviderResolver(intasend, paddle, sandbox);

    expect(resolver.byName('INTASEND')).toBe(intasend);
    expect(resolver.byName('PADDLE')).toBe(paddle);
    expect(resolver.byName('SANDBOX')).toBe(sandbox);
    expect(resolver.byName('SOME_OTHER_PROVIDER')).toBeNull();
    expect(resolver.byName(null)).toBeNull();
    expect(resolver.byName(undefined)).toBeNull();
  });

  it('directFallback always returns the sandbox provider, regardless of what else is configured', () => {
    const sandbox = fakeSandbox();
    const resolver = new PaymentProviderResolver(
      fakeIntasend(true),
      fakePaddle(true),
      sandbox,
    );

    expect(resolver.directFallback()).toBe(sandbox);
  });

  it('liveConfigured is true once either real provider is enabled', () => {
    expect(
      new PaymentProviderResolver(
        fakeIntasend(true),
        fakePaddle(false),
        fakeSandbox(),
      ).liveConfigured,
    ).toBe(true);
    expect(
      new PaymentProviderResolver(
        fakeIntasend(false),
        fakePaddle(true),
        fakeSandbox(),
      ).liveConfigured,
    ).toBe(true);
    expect(
      new PaymentProviderResolver(
        fakeIntasend(false),
        fakePaddle(false),
        fakeSandbox(),
      ).liveConfigured,
    ).toBe(false);
  });
});
