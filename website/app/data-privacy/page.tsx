import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Data Privacy Notice | Drift Tennis",
  description: "A practical guide to the personal data Drift Tennis handles and why.",
};

const sections = [
  { id: "summary", title: "At a glance" },
  { id: "data-map", title: "Our data map" },
  { id: "lawful-use", title: "Why we use data" },
  { id: "privacy-controls", title: "Privacy controls" },
  { id: "email", title: "Emails and offers" },
  { id: "sharing", title: "Third parties" },
  { id: "retention", title: "How long we keep data" },
  { id: "requests", title: "Your privacy requests" },
];

export default function DataPrivacyPage() {
  return (
    <LegalLayout
      title="Data Privacy Notice"
      summary="A plain-language reference for the data Drift Tennis handles, why we need it, what you control and how to reach us."
      sections={sections}
    >
      <section id="summary">
        <h2>At a glance</h2>
        <div className="legal-highlight">
          <p><strong>We collect data to run Drift Tennis, not to trade in it.</strong> We do not sell, rent, trade or share personal data for another party’s advertising, marketing, data brokerage or independent use.</p>
          <p><strong>We use email for Drift Tennis.</strong> This includes necessary account messages and, unless you opt out, internal product updates and occasional offers from Drift Tennis. We do not give your address to other businesses for their promotions.</p>
          <p><strong>You have control.</strong> You can manage supported visibility settings in the app and ask us to access, correct, export or delete your data.</p>
        </div>
      </section>

      <section id="data-map">
        <h2>Our data map</h2>
        <div className="legal-table-wrap">
          <table>
            <thead>
              <tr><th scope="col">Data</th><th scope="col">Why we use it</th><th scope="col">Who can see it</th></tr>
            </thead>
            <tbody>
              <tr><td>Account details: email, optional phone number, name and sign-in records</td><td>Create and protect your account, verify access and help you recover it</td><td>Drift Tennis. Name and selected profile information may be shown to other members</td></tr>
              <tr><td>Profile, level, assessment, ratings, goals, preferences and availability</td><td>Match you appropriately, support development and power tennis and padel features</td><td>Other members according to the feature and your visibility settings</td></tr>
              <tr><td>Approximate location and preferred courts or clubs</td><td>Show relevant players, courts and clubs nearby</td><td>We show coarse distance bands, not your exact location, in player discovery</td></tr>
              <tr><td>Messages, match proposals, scores, reflections, club posts and reactions</td><td>Run conversations, fixtures, results, competition records and community features</td><td>The relevant conversation, match, club or competition participants</td></tr>
              <tr><td>Reports and support requests</td><td>Investigate safety issues, resolve problems and protect the community</td><td>Authorised Drift Tennis staff</td></tr>
              <tr><td>Notification preferences and device token</td><td>Send the in-app and push notifications you have enabled</td><td>Drift Tennis</td></tr>
              <tr><td>Waitlist name, email, interest, optional country, city and level</td><td>Tell you about the launch, internal product updates and Drift Tennis offers</td><td>Drift Tennis</td></tr>
              <tr><td>Club subscription and billing records</td><td>Operate paid club services, provide receipts and meet accounting obligations</td><td>Drift Tennis and the payment provider you use at checkout</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section id="lawful-use">
        <h2>Why we use data</h2>
        <p>We use information only for clear purposes: to provide the feature you ask for, protect accounts and community safety, meet legal obligations, and communicate about Drift Tennis. Where consent is the appropriate basis, we ask for it. You can withdraw consent for optional processing, including promotional email, at any time.</p>
        <p>We do not use sensitive profile information to make decisions that produce legal or similarly significant effects about you. Ratings and discovery suggestions are product features, not official rankings or decisions about your rights.</p>
      </section>

      <section id="privacy-controls">
        <h2>Privacy controls in the app</h2>
        <p>You can choose whether your detailed skill breakdown and availability are visible to everyone or only to your connections. You can also manage supported notification preferences, block people and report conduct or content. These controls change what other members can see, but some information remains necessary for the Service to work, such as a match result in the relevant fixture.</p>
      </section>

      <section id="email">
        <h2>Emails and offers</h2>
        <p>We use your email to send verification, security, support, billing and other essential service notices. We may also use it to send internal Drift Tennis product updates, launch news and occasional offers. This is our own communication only. We do not share your email with third parties for their marketing.</p>
        <p>To stop promotional messages, email <a href="mailto:drift@einsbrand.com?subject=Unsubscribe">drift@einsbrand.com</a> with “Unsubscribe” in the subject line. Essential operational messages will still be sent when needed.</p>
      </section>

      <section id="sharing">
        <h2>Third parties</h2>
        <p>We do not sell, rent, trade or share personal data with third parties for their own marketing, advertising, data-brokerage or independent purposes.</p>
        <p>If you choose an external payment checkout or optional social sign-in, you interact with that provider directly and its own terms and privacy information apply. We may disclose data where the law requires it or where necessary to protect people, investigate abuse, enforce our rights or keep the Service secure.</p>
      </section>

      <section id="retention">
        <h2>How long we keep data</h2>
        <p>We retain data for as long as it is needed to provide the Service and meet security, safety, legal and financial obligations. When you request account deletion, your account is disabled immediately. After a 30-day recovery period, we remove or anonymise direct identifiers and personal profile data. This action is irreversible once completed.</p>
        <p>To protect other people’s legitimate records, preserve competition integrity and meet legal obligations, we may retain limited or anonymised match, standings, conversation, safety, club or billing records. Encrypted backup copies can retain information from before deletion for up to 14 days before they age out.</p>
      </section>

      <section id="requests">
        <h2>Your privacy requests</h2>
        <p>You may ask us to access, correct, export, object to or delete your personal information, subject to applicable law. Send your request to <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a> and include enough information for us to find and verify your account. We will respond in line with applicable law.</p>
        <p>For Kenya-based users, the Kenyan Data Protection Act, 2019 provides rights to be informed, access personal data, object to processing, correct false or misleading data and seek deletion in appropriate circumstances. If you remain dissatisfied after contacting us, you may raise a complaint with the <a href="https://www.odpc.go.ke/" target="_blank" rel="noreferrer">Office of the Data Protection Commissioner</a>.</p>
      </section>
    </LegalLayout>
  );
}
