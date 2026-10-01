import type { Metadata } from "next";

import { ReservedLandingPage } from "../page";
import { getDictionary, resolveLocale } from "@/lib/content";

type PageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getDictionary(resolveLocale(locale));
  return {
    title: { absolute: `${t.meta.title} (reserved)` },
    description: t.meta.description,
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
  };
}

export default function ReservedPage(props: PageProps) {
  return <ReservedLandingPage {...props} />;
}
