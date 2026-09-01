"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";

function isAuthenticatedMediaPath(src: string): boolean {
  return src.startsWith("/clubs/") && src.includes("/media/") && src.endsWith("/content");
}

export function EventImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(() =>
    isAuthenticatedMediaPath(src) ? null : src,
  );
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);

    if (!isAuthenticatedMediaPath(src)) {
      setResolvedSrc(src);
      return;
    }

    setResolvedSrc(null);
    let alive = true;
    let objectUrl: string | null = null;

    api
      .blob(src)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setResolvedSrc(objectUrl);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });

    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (failed || !resolvedSrc) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
