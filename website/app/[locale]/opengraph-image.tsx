import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { getDictionary, resolveLocale } from "@/lib/content";

/**
 * Link-preview image for every page under a locale (home and waitlist):
 * the hero court under a brand-blue scrim, the logo on a white card, and the
 * locale's hero payoff line. Rendered at build time per locale.
 */
export const alt = "Drift Tennis";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const [heroData, logoData] = await Promise.all([
  readFile(join(process.cwd(), "public/images/hero-court.jpg"), "base64"),
  readFile(join(process.cwd(), "public/images/logo.png"), "base64"),
]);
const heroSrc = `data:image/jpeg;base64,${heroData}`;
const logoSrc = `data:image/png;base64,${logoData}`;

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = getDictionary(resolveLocale(locale));

  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          background: "#1c91d0",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroSrc}
          alt=""
          width={size.width}
          height={size.height}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            objectFit: "cover",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size.width,
            height: size.height,
            background:
              "linear-gradient(180deg, rgba(14,86,128,0.55) 0%, rgba(14,86,128,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            width: "100%",
            height: "100%",
            padding: 64,
          }}
        >
          <div
            style={{
              display: "flex",
              alignSelf: "flex-start",
              background: "#ffffff",
              borderRadius: 20,
              padding: "12px 24px",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} alt="" width={200} height={100} />
          </div>
          <div
            style={{
              display: "flex",
              maxWidth: 940,
              color: "#ffffff",
              fontSize: 76,
              fontWeight: 700,
              lineHeight: 1.08,
            }}
          >
            {t.hero.resolve}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
