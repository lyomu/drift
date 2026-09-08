/**
 * /waitlist — the site's one conversion page.
 *
 * Split layout: the form on the left at a comfortable reading measure, a
 * full-height court photograph on the right. The header is rendered in its
 * `minimal` variant because this route has none of the landing page's
 * sections to link to, and a conversion page should not offer five ways to
 * leave.
 *
 * What the page promises is exactly what the backend does: store the address
 * and send one email at launch. No counts, no queue position, no scarcity
 * (DESIGN.md rule 4; PRODUCT.md forbids numbers that do not exist).
 */
import type { Metadata } from "next";
import Image from "next/image";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { waitlist } from "@/lib/content";
import { images } from "@/lib/images";

export const metadata: Metadata = {
  title: "Join the waitlist · Drift Tennis",
  description:
    "Drift Tennis launches on Android first, iOS to follow. Leave your email and we'll tell you the day it goes live.",
};

export default function WaitlistPage() {
  const photo = images.waitlist;

  return (
    <>
      <SiteHeader minimal />
      <main>
        <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)]">
          <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:max-w-none lg:px-10 lg:py-20 xl:px-16">
            <div className="mx-auto max-w-3xl">
              <p className="badge badge-primary">{waitlist.eyebrow}</p>
              <h1 className="court-rule display-lg mt-4 pb-1">
                {waitlist.title}
              </h1>
              <p className="mt-8 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
                {waitlist.body}
              </p>

              <div className="mt-8">
                <WaitlistForm />
              </div>
            </div>
          </div>

          {/* Decorative on this route — the page's meaning is entirely in the
              copy and the form beside it, so the photograph is hidden from
              assistive tech rather than described twice. */}
          <div
            aria-hidden="true"
            className="relative hidden lg:block"
          >
            <Image
              src={photo.src}
              alt=""
              fill
              priority
              sizes="38vw"
              className="object-cover"
              style={{ objectPosition: photo.focal }}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
