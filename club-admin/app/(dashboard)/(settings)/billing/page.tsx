"use client";

import { IconChip, Panel } from "@/components/dashboard-design";
import { PageHeader } from "@/components/ui";
import { useT } from "@/lib/i18n/i18n-context";

/**
 * Drift is free during beta — no plans, payment methods or invoices to
 * manage. The real billing flow (`backend/src/payments/*`) is untouched and
 * ready to come back; this page is a deliberate, temporary stand-in.
 */
export default function BillingPage() {
  const t = useT();
  return (
    <div>
      <PageHeader compact title={t("a.billing")} />
      <Panel>
        <div className="flex items-start gap-4">
          <IconChip icon="celebration" tone="info" />
          <div>
            <h2 className="text-[16px] font-extrabold text-drift-text-primary">{t("a.driftIsFreeDuringBeta")}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-drift-text-secondary">
              {t("billing.bodyBefore")}{" "}
              <a
                href="#"
                className="font-semibold text-drift-primary-dark underline underline-offset-2"
              >
                {t("billing.donate")}
              </a>
              {t("billing.bodyAfter")}
            </p>
          </div>
        </div>
      </Panel>
    </div>
  );
}
