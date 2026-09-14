/**
 * /waitlist — the site's one conversion page, one instance per locale.
 *
 * Split layout: the form on the left at a comfortable reading measure, a
 * full-height court photograph on the right. The header is rendered in its
 * `minimal` variant because this route has none of the landing page's
 * sections to link to, and a conversion page should not offer five ways to
 * leave. The language switcher stays in the minimal header: picking up the
 * wrong language must always have a visible way out.
 *
 * What the page promises is exactly what the backend does: store the address
 * and send one email at launch. No counts, no queue position, no scarcity
 * (DESIGN.md rule 4; PRODUCT.md forbids numbers that do not exist).
 */
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { WaitlistForm } from "@/components/waitlist-form";
import { getDictionary } from "@/lib/content";
import { isLocale } from "@/lib/locales";
import { images } from "@/lib/images";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const t = getDictionary(locale);
  return {
    title: `${t.waitlist.title} · Drift Tennis`,
    description: t.waitlist.body,
    alternates: {
      canonical: locale === "en" ? "/waitlist" : `/${locale}/waitlist`,
      languages: {
        en: "/waitlist",
        fr: "/fr/waitlist",
        es: "/es/waitlist",
        "x-default": "/waitlist",
      },
    },
  };
}

export default async function WaitlistPage({ params }: PageProps) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const t = getDictionary(locale);
  const photo = images.waitlist;

  return (
    <>
      <SiteHeader minimal locale={locale} />
      <main>
        <div className="lg:grid lg:min-h-[calc(100vh-4rem)] lg:grid-cols-[minmax(0,1fr)_minmax(0,38%)]">
          <div className="mx-auto w-full max-w-3xl px-4 py-14 sm:px-6 lg:max-w-none lg:px-10 lg:py-20 xl:px-16">
            <div className="mx-auto max-w-3xl">
              <p className="badge badge-primary enter enter-1">{t.waitlist.eyebrow}</p>
              <h1 className="court-rule display-lg enter enter-2 mt-4 pb-1">
                {t.waitlist.title}
              </h1>
              <p className="enter enter-3 mt-8 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
                {t.waitlist.body}
              </p>

              <div className="enter enter-4 mt-8">
                <WaitlistForm t={t.waitlist} />
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
              className="hero-photo object-cover"
              style={{ objectPosition: photo.focal }}
            />
          </div>
        </div>
      </main>
      <SiteFooter locale={locale} />
    </>
  );
}
