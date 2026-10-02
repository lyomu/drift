import Image from "next/image";

/**
 * The drift-icon mark's black shield-half disappears against a dark surface,
 * so this stacks the blue crop (light mode) and the white crop (dark mode)
 * and lets `.brand-icon-light`/`.brand-icon-dark` in globals.css pick one via
 * the same `data-theme`/`prefers-color-scheme` rules the color tokens use.
 */
export function BrandIcon({ className = "" }: { className?: string }) {
  return (
    <span className={`relative inline-block ${className}`}>
      <Image
        src="/images/drift-icon.png"
        alt="Drift"
        width={512}
        height={453}
        className="brand-icon-light h-full w-auto"
      />
      <Image
        src="/images/drift-icon-white.png"
        alt="Drift"
        width={512}
        height={423}
        className="brand-icon-dark h-full w-auto"
      />
    </span>
  );
}
