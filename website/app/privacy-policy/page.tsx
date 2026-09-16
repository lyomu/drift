import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Privacy Policy | Drift Tennis",
  description: "How Drift Tennis collects, uses and protects personal information.",
};

const sections = [
  { id: "who", title: "Who we are" },
  { id: "collect", title: "Information we collect" },
  { id: "use", title: "How we use it" },
  { id: "sharing", title: "No sale or marketing sharing" },
  { id: "visibility", title: "What other users can see" },
  { id: "email", title: "Email updates and offers" },
  { id: "retention", title: "Retention and deletion" },
  { id: "security", title: "Security" },
  { id: "rights", title: "Your choices and rights" },
  { id: "changes", title: "Changes and contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      summary="We collect only the information we need to run Drift Tennis, keep it useful and keep the community safe. We do not sell, rent or share personal data for advertising or another party’s independent use."
      sections={sections}
    >
      <section id="who">
        <h2>Who we are</h2>
        <p>Drift Tennis (“we”, “us” or “our”) provides a tennis-first platform for players, clubs, coaches and padel players. This Privacy Policy explains how we handle personal information when you use our app, website, waitlist and related services.</p>
        <p>For privacy questions or requests, contact us at <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>. Our more detailed Data Privacy Notice sits alongside this policy and explains the information categories, purposes and retention approach in a practical format.</p>
      </section>

      <section id="collect">
        <h2>Information we collect</h2>
        <p>Depending on how you use Drift Tennis, we collect:</p>
        <ul>
          <li><strong>Account information:</strong> email address, optional phone number, name, account credentials and age-confirmation timestamp.</li>
          <li><strong>Profile and play information:</strong> profile photo, bio, tennis or padel level, assessment answers, ratings, goals, preferred formats, availability, preferred clubs and courts, and approximate location information you choose to provide.</li>
          <li><strong>Activity and community information:</strong> connections, messages, match proposals and results, league and club participation, posts, reactions, reports, support requests and learning activity.</li>
          <li><strong>Device and service information:</strong> sign-in and security records, notification preferences and, if you enable push notifications, a device notification token.</li>
          <li><strong>Waitlist information:</strong> first name, email, player or club interest, and optional country, city and self-reported level.</li>
          <li><strong>Payment-related information:</strong> subscription and billing records for paid club services. Full card details are entered with the payment provider and are not stored by Drift Tennis.</li>
        </ul>
      </section>

      <section id="use">
        <h2>How we use information</h2>
        <p>We use personal information to:</p>
        <ul>
          <li>create and secure accounts, verify email addresses and provide customer support;</li>
          <li>make the Service work, including discovery, match scheduling, ratings, competitions, messaging, clubs, learning and notifications;</li>
          <li>prevent fraud, abuse and unsafe conduct, investigate reports and protect the community;</li>
          <li>maintain accurate records, resolve disputes and meet legal obligations;</li>
          <li>send essential account, security, billing and service messages; and</li>
          <li>send internal Drift Tennis product updates, launch news and occasional offers as described below.</li>
        </ul>
        <p>We process information with your consent where that is the appropriate basis, to provide the Service you ask for, to meet legal obligations, and where necessary for our legitimate interests in operating a secure, useful community. We balance those interests against your privacy rights.</p>
      </section>

      <section id="sharing">
        <h2>No sale or marketing sharing</h2>
        <p>We do not sell, rent, trade or share your personal information with third parties for advertising, marketing, data brokerage or their independent use. We do not provide user lists to advertisers or allow third parties to market to you using Drift Tennis information.</p>
        <p>A limited exception applies where you choose to use an external service yourself, such as a hosted payment page or optional Apple or Google sign-in. That service handles information you give it under its own privacy notice. We may also disclose information if required by law or where reasonably necessary to protect the rights, safety or security of Drift Tennis, our users or the public.</p>
      </section>

      <section id="visibility">
        <h2>What other users can see</h2>
        <p>Drift Tennis is a community service, so some profile and play information is visible to other members to make the features work. For example, other players may see your name, profile photo, selected profile details, level, match or competition information, and content you choose to post or send. We use coarse distance bands for player discovery rather than exposing exact location.</p>
        <p>In the app, you can choose whether detailed availability and skill-breakdown information is visible to everyone or only to your connections. Your messages are visible to the people in the relevant conversation. You should avoid posting private information in public or group spaces.</p>
      </section>

      <section id="email">
        <h2>Email updates and offers</h2>
        <p>In addition to essential emails, we may use your email address to send internal Drift Tennis product updates, launch announcements and occasional offers related to Drift Tennis. We do not give your email address to another business so it can promote its own products.</p>
        <p>You can stop non-essential promotional email at any time by emailing <a href="mailto:drift@einsbrand.com?subject=Unsubscribe">drift@einsbrand.com</a> with “Unsubscribe” in the subject line. You will still receive necessary account, safety, billing and service notices.</p>
      </section>

      <section id="retention">
        <h2>Retention and deletion</h2>
        <p>We keep personal information only for as long as it is needed for the purposes in this policy, including security, legal, billing and safety needs. You can request account deletion in the app. Your account is deactivated straight away and your deletion request enters a 30-day recovery window. After that window, we anonymise or remove direct personal identifiers, profile contact details, photos, device tokens and certain personal content.</p>
        <p>Some records may remain in an anonymised or limited form where removing them would unfairly affect other players’ match history, standings, conversations, club records, safety records or financial obligations. Backups can retain pre-deletion information for up to 14 days before they expire. Account deletion is irreversible once completed.</p>
      </section>

      <section id="security">
        <h2>Security</h2>
        <p>We use reasonable technical and organisational measures designed to protect personal information, including access controls, account authentication, encrypted transport and security monitoring. No online service can promise absolute security. Please use a strong, unique password and keep your device secure.</p>
      </section>

      <section id="rights">
        <h2>Your choices and rights</h2>
        <p>Subject to applicable law, you may ask to access, correct, update, delete or receive a copy of your personal information, object to certain processing, or withdraw consent. You may also manage supported privacy and notification settings in the app. To make a request, email <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>. We may need to verify your identity before acting.</p>
        <p>If you are in Kenya and believe your privacy rights have not been addressed, you may contact the Office of the Data Protection Commissioner. The rights described here are intended to reflect the Kenyan Data Protection Act, 2019 and do not limit rights available under other applicable law.</p>
      </section>

      <section id="changes">
        <h2>Changes and contact</h2>
        <p>We may update this policy as Drift Tennis changes or as legal requirements evolve. We will post the updated version here and revise the effective date. For material changes, we will provide additional notice where appropriate.</p>
        <p>Contact us about this policy at <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
