import type { Metadata } from "next";

import { LegalLayout } from "@/components/legal-layout";

export const metadata: Metadata = {
  title: "Terms and Conditions | Drift Tennis",
  description: "The terms that apply when you use Drift Tennis.",
};

const sections = [
  { id: "agreement", title: "Your agreement" },
  { id: "eligibility", title: "Eligibility and accounts" },
  { id: "using-drift", title: "Using Drift Tennis" },
  { id: "community", title: "Community and safety" },
  { id: "content", title: "Your content" },
  { id: "payments", title: "Club services and payments" },
  { id: "email", title: "Email updates and offers" },
  { id: "liability", title: "Safety and liability" },
  { id: "changes", title: "Changes and contact" },
];

export default function TermsPage() {
  return (
    <LegalLayout
      title="Terms and Conditions"
      summary="These terms explain the ground rules for using Drift Tennis. They are written for players, coaches, clubs and administrators using our services."
      sections={sections}
    >
      <section id="agreement">
        <h2>Your agreement</h2>
        <p>These Terms and Conditions govern your use of the Drift Tennis mobile app, website, club tools and related services (together, “Drift Tennis” or the “Service”). By creating an account, joining the waitlist or using the Service, you agree to these terms and to our Privacy Policy.</p>
        <p>If you use Drift Tennis for a club, organisation or other group, you confirm that you are authorised to accept these terms for that group. If you do not agree, please do not use the Service.</p>
      </section>

      <section id="eligibility">
        <h2>Eligibility and accounts</h2>
        <p>You must provide accurate account information and keep your sign-in details secure. You are responsible for activity carried out through your account. Tell us promptly at <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a> if you believe your account has been accessed without permission.</p>
        <p>Drift Tennis is currently intended for adults. Do not create an account if you are under 18. We do not ask for a date of birth for this purpose; account creation uses an age-confirmation step instead.</p>
      </section>

      <section id="using-drift">
        <h2>Using Drift Tennis</h2>
        <p>You may use the Service to discover tennis and padel opportunities, connect with other players, arrange matches, participate in competitions, follow clubs, track development and use other features we make available.</p>
        <p>You must not:</p>
        <ul>
          <li>use the Service unlawfully, fraudulently or to harm, harass or threaten anyone;</li>
          <li>impersonate another person, misrepresent your level, results, club role or identity;</li>
          <li>upload malware, scrape the Service, interfere with its security or attempt unauthorised access;</li>
          <li>use another member’s personal information outside the purpose for which it was made available; or</li>
          <li>use Drift Tennis to advertise unrelated services, solicit money or send spam.</li>
        </ul>
        <p>We may limit, suspend or close an account where we reasonably believe these terms, our community standards or the safety of the Service have been breached.</p>
      </section>

      <section id="community">
        <h2>Community, matches and safety</h2>
        <p>Drift Tennis helps people find and organise play. It does not organise, supervise or insure matches, coaching sessions, clubs, courts or events, and it does not guarantee another user’s identity, conduct, skill level, availability or the availability or condition of a venue.</p>
        <p>Make your own sensible decisions about whom to meet and where to play. Use public venues where appropriate, follow venue rules, and stop contact that makes you uncomfortable. You can use in-app reporting and blocking tools for concerning conduct. If there is an immediate risk of harm, contact local emergency services first.</p>
        <p>Ratings, standings and match records are product features based on the information and confirmations available in the Service. They are not official rankings and should not be treated as a guarantee of skill, eligibility or outcome.</p>
      </section>

      <section id="content">
        <h2>Your content</h2>
        <p>You keep ownership of content you submit, including profile information, photos, messages, match reflections and club posts. You give Drift Tennis a limited, non-exclusive licence to host, display and process that content only as needed to provide, secure and improve the Service.</p>
        <p>You are responsible for having the rights to share your content. Do not upload content that is unlawful, abusive, infringing, sexually explicit, deceptive or that discloses someone else’s private information without permission.</p>
      </section>

      <section id="payments">
        <h2>Club services and payments</h2>
        <p>Some club services may be offered on a paid subscription basis. Prices, billing periods, renewal terms and any applicable taxes are presented before a club completes a purchase. A club administrator is responsible for keeping billing details current and for cancelling before the next billing date where cancellation is available.</p>
        <p>Payment processing may take place on a payment provider’s own secure checkout page. The provider’s terms and privacy notice apply to payment details submitted there. Drift Tennis does not store full payment-card details.</p>
      </section>

      <section id="email">
        <h2>Email updates and offers</h2>
        <p>We use the email address you give us for essential account and service messages, such as verification, security, support and important changes. We may also send internal Drift Tennis product updates, launch news and occasional offers that relate to Drift Tennis.</p>
        <p>You can ask us to stop non-essential promotional emails at any time by emailing <a href="mailto:drift@einsbrand.com?subject=Unsubscribe">drift@einsbrand.com</a> with “Unsubscribe” in the subject line. Opting out does not stop essential service or security messages.</p>
      </section>

      <section id="liability">
        <h2>Safety and liability</h2>
        <p>To the extent permitted by law, Drift Tennis is provided on an “as available” basis. We do not promise that the Service will always be uninterrupted, error-free or suitable for every purpose. We are not responsible for disputes between users, injuries, loss or damage connected with an independent match, venue, event, coach or other user’s conduct.</p>
        <p>Nothing in these terms excludes liability that cannot lawfully be excluded or limited, including your rights under applicable consumer protection law.</p>
      </section>

      <section id="changes">
        <h2>Changes, termination and contact</h2>
        <p>We may update the Service or these terms as it develops. For a material change, we will give reasonable notice through the Service or by email before it takes effect where practical. Continuing to use the Service after the effective date means you accept the updated terms.</p>
        <p>You may stop using Drift Tennis at any time. You can request account deletion in the app. The account is deactivated immediately and personal information is then anonymised after a 30-day recovery window, subject to records we must retain for other players’ records, safety, legal obligations or legitimate operational reasons. See our Privacy Policy for detail.</p>
        <p>These terms are governed by the laws of Kenya, except where mandatory law in your place of residence provides otherwise. Questions about these terms can be sent to <a href="mailto:drift@einsbrand.com">drift@einsbrand.com</a>.</p>
      </section>
    </LegalLayout>
  );
}
