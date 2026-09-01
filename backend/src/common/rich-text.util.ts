import { FilterXSS } from 'xss';

/**
 * The single write-side chokepoint for user-authored rich text (currently
 * league `rulesText`, produced by the Club Admin WYSIWYG editor). Everything
 * that reads the stored value — React `dangerouslySetInnerHTML` on the two
 * admin consoles and the Flutter `HtmlWidget` on mobile — trusts that it was
 * cleaned here, so this must run on every create/update path.
 *
 * The allowlist is deliberately the exact set the Tiptap editor can emit:
 * inline marks, lists, sub-headings, blockquote and links. No `style`, no
 * `class`, no `id`, no media, no tables. `xss` drops any attribute (and its
 * `javascript:` / `data:` URL values) that isn't listed.
 */
const filter = new FilterXSS({
  whiteList: {
    p: [],
    br: [],
    strong: [],
    em: [],
    u: [],
    s: [],
    ul: [],
    ol: [],
    li: [],
    h2: [],
    h3: [],
    h4: [],
    blockquote: [],
    a: ['href'],
  },
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
});

export function sanitizeRichText(html: string): string;
export function sanitizeRichText(html: string | undefined): string | undefined;
export function sanitizeRichText(html: string | undefined): string | undefined {
  if (html == null) return undefined;

  // Tiptap emits <strong>/<em>, but a paste from Word/Docs brings <b>/<i>.
  const normalised = html.replace(
    /<(\/?)(b|i)(\s[^>]*)?>/gi,
    (_m, slash: string, tag: string) =>
      `<${slash}${tag.toLowerCase() === 'b' ? 'strong' : 'em'}>`,
  );

  let clean = filter.process(normalised).trim();

  // `xss` drops an unsafe href value (`javascript:`, `data:`) but leaves a
  // bare `<a href>` behind — collapse those to plain text so nothing renders
  // as a dead link.
  clean = clean.replace(/<a href>(.*?)<\/a>/gi, '$1');

  // Every surviving <a> came through the allowlist with at most an href — pin
  // the safe rel/target here rather than trusting editor output.
  clean = clean.replace(
    /<a\b/gi,
    '<a rel="noopener noreferrer nofollow" target="_blank"',
  );

  // An editor emptied by the user serialises to `<p></p>` — normalise that
  // (and any all-whitespace result) back to "no rules set".
  if (clean === '' || clean === '<p></p>') return undefined;
  return clean;
}
