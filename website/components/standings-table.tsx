/**
 * The standings table is the page's proof moment: competition data is the
 * product's spine, so the features speak in a real standings shape.
 * Rows are illustrative and labelled.
 */
import { getDictionary, standingsRows, type Locale } from "@/lib/content";

function FormDots({ form }: { form: string }) {
  const results = form.split(" ");
  return (
    <span className="flex gap-1" role="img" aria-label={`Recent form: ${form}`}>
      {results.map((result, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={`form-dot h-2.5 w-2.5 rounded-full ${
            result === "W"
              ? "bg-[var(--color-success)]"
              : "bg-[var(--color-error)]"
          }`}
        />
      ))}
    </span>
  );
}

export function StandingsTable({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  return (
    <section
      id="standings"
      data-on-primary
      className="reveal bg-[var(--color-primary-dark)] py-16 text-white lg:py-20"
      aria-labelledby="standings-heading"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 min-w-0 lg:grid-cols-[1fr_1.4fr] lg:items-center lg:gap-16">
          <div className="reveal-stagger min-w-0">
            <p className="badge !bg-white/10 text-white">{t.standings.badge}</p>
            <h2 id="standings-heading" className="display-lg mt-4">
              {t.standings.title}
            </h2>
            <ul className="mt-6 flex flex-col gap-2 text-sm text-white/90">
              {t.standings.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>

          <div className="min-w-0">
            <div className="drift-card overflow-hidden !text-[var(--color-text-primary)]">
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                <p className="text-sm font-bold">{t.standings.cardTitle}</p>
                <span className="badge badge-primary">{t.standings.cardBadge}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                <caption className="sr-only">
                  {t.standings.note}
                </caption>
                <thead>
                  <tr className="text-left text-xs text-[var(--color-text-secondary)]">
                    {t.standings.columns.map((column) => (
                      <th key={column} scope="col" className="px-4 py-2 font-semibold">
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="reveal-stagger tabular">
                  {standingsRows.map((row) => (
                    <tr
                      key={row.pos}
                      className="border-t border-[var(--color-border)]"
                    >
                      <td className="px-4 py-2.5 font-bold">{row.pos}</td>
                      <td className="px-4 py-2.5 font-semibold">{row.player}</td>
                      <td className="px-4 py-2.5">{row.p}</td>
                      <td className="px-4 py-2.5">{row.w}</td>
                      <td className="px-4 py-2.5">{row.l}</td>
                      <td className="px-4 py-2.5">{row.rating.toFixed(1)}</td>
                      <td className="px-4 py-2.5">
                        <FormDots form={row.form} />
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            </div>
            <p className="mt-3 text-right text-xs text-white/90">
              {t.standings.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
