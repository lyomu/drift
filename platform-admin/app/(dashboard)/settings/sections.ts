/**
 * The one source of truth for the Platform Settings sections — consumed by the
 * tab rail in `layout.tsx` and by the overview cards in `page.tsx`, so a new
 * section only ever needs adding here plus its own route folder.
 */
export type SettingsSection = {
  /** Route segment under /settings. */
  href: string;
  /** Short label for the tab rail, where horizontal space is tight. */
  tab: string;
  /** Full heading used on the section page and its overview card. */
  title: string;
  description: string;
  icon: string;
  tone: "blue" | "green" | "amber" | "red" | "gray";
};

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    href: "/settings/markets",
    tab: "Markets",
    title: "Countries & Cities",
    description: "Supported Drift markets and city-level availability.",
    icon: "language",
    tone: "blue",
  },
  {
    href: "/settings/feature-flags",
    tab: "Feature Flags",
    title: "Feature Flags",
    description: "Toggle features by market, cohort, and rollout percentage.",
    icon: "toggle_on",
    tone: "green",
  },
  {
    href: "/settings/notifications",
    tab: "Notifications",
    title: "Notification Templates",
    description: "Push, email, and SMS copy with a draft/live lifecycle.",
    icon: "notifications",
    tone: "amber",
  },
  {
    href: "/settings/integrations",
    tab: "Integrations",
    title: "API & Integrations",
    description: "Provider configuration, credential references, and recorded connection health.",
    icon: "hub",
    tone: "blue",
  },
];
