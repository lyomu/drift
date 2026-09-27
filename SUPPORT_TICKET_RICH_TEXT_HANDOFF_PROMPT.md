# Handoff: rich text + image attachment for support ticket replies

Picking this up mid-implementation. The plan behind this work is at
`C:\Users\gmnyo\.claude\plans\soft-exploring-cookie.md` (still there,
matches what's described below) — read it first for the full rationale
(why separate attachments not inline `<img>`, why each file mirrors an
existing pattern). This doc is the "what's actually on disk right now"
complement to it.

**Deliberately left uncommitted** (a sibling task asked for everything
*except* this to be pushed — see PR #10,
`fix/brand-blue-match-and-login-panel`, already merged-ready). Nothing
below has been committed anywhere. Verify with `git status` before
touching branches.

## Backend — done, compiling, migrated locally

All of this is real and working (confirmed via the running `nest start
--watch` dev server's own log: both new routes mapped, app started clean,
zero errors):

- `backend/prisma/schema.prisma` — new `SupportTicketMessageAttachment`
  model + `attachments` relation on `SupportTicketMessage`.
- `backend/prisma/migrations/20260917075215_add_support_ticket_message_attachments/`
  — **already applied** to the local dev database (`npx prisma migrate
  dev` was run). This migration directory is untracked; if you reset the
  local DB from a fresh clone before committing this, you'll need to
  re-run migrate to get it back.
- `backend/src/common/rich-text.util.ts` — added `plainTextFromRichText()`
  (strips the sanitizer's fixed tag set down to plain text) alongside the
  existing `sanitizeRichText()`. Needed because `respondToTicket` emails
  the reply to the ticket's user as plain text — without this, the email
  would show literal `<p>`/`<strong>` tags.
- `backend/src/platform-admin/dto/support-admin.dto.ts` —
  `RespondSupportTicketDto.body`'s `@MaxLength` raised 4000 → 8000 (HTML
  tag overhead eats into the same visible-text budget).
- `backend/src/platform-admin/support-admin.service.ts` —
  `respondToTicket` now calls `sanitizeRichText(dto.body.trim())` before
  storing (previously stored raw, unsanitized — a real gap, not
  something this work introduced but worth knowing it existed until now),
  throws if sanitization empties it out, uses `plainTextFromRichText()`
  for the outbound email, and now returns `messageId` alongside the
  ticket. Two new methods: `addMessageAttachment` and
  `messageAttachmentContent`, mirroring
  `club-operations.service.ts`'s `uploadMedia`/`mediaContent` almost
  exactly (same `Bytes`-column-in-Postgres shape, same mimetype check).
  `TICKET_INCLUDE`'s `messages` include now also pulls `attachments`.
- `backend/src/platform-admin/support-admin.controller.ts` — two new
  routes, both guarded by the controller's existing
  `PlatformGuard`/`SUPPORT_MANAGE`:
  - `POST tickets/:ticketId/messages/:messageId/attachments` (Multer
    `FileInterceptor`, 5MB limit, matches `club-operations.controller.ts`)
  - `GET tickets/:ticketId/messages/:messageId/attachments/:id/content`
    (streams the bytes back with the right `Content-Type`)

## Frontend (platform-admin) — partially wired, **not done**

Done:
- `platform-admin/package.json` (+ `package-lock.json`) — added
  `@tiptap/pm`/`@tiptap/react`/`@tiptap/starter-kit` at `^3.30.5`
  (matching club-admin's exact versions), already `npm install`ed.
  **`npm install` reported 2 high + 1 critical vulnerabilities** —
  unverified whether these are new (from Tiptap's dependency tree) or
  pre-existing in platform-admin generally; check before assuming either
  way, and don't run `npm audit fix --force` (project convention —
  proposes breaking downgrades elsewhere in this repo).
- `platform-admin/components/RichTextEditor.tsx` (new, untracked) —
  ported verbatim from `club-admin/components/RichTextEditor.tsx`. Zero
  adaptation needed: platform-admin already has the identical `drift-*`
  Tailwind token mapping and the same `MaterialIcon` component at the same
  relative import path, confirmed before porting.
- `platform-admin/components/AttachmentUpload.tsx` (new, untracked) —
  trimmed from `club-admin/components/EventImageUpload.tsx`: same
  validate/preview logic, compact inline picker (button + thumbnail chip)
  instead of a full dropzone card, since it sits beside a reply box rather
  than being its own form section. Exports `validateAttachment`,
  `uploadMessageAttachment(ticketId, messageId, file)`, and the
  `<AttachmentUpload>` component.
- `platform-admin/app/globals.css` — added the `.drift-prose` block
  (ported verbatim from club-admin's globals.css — the CSS that styles
  both the editor's content area and read-only rendered HTML).
- `platform-admin/lib/support-types.ts` — added
  `SupportTicketMessageAttachment` type and an `attachments` field on
  `SupportTicketMessage`.

**Not done** — `platform-admin/app/(dashboard)/support/tickets/page.tsx`:
imports for `RichTextEditor`/`RichText`/`AttachmentUpload` and an
`attachmentFile`/`attachmentError` state pair were added, but the actual
wiring was interrupted mid-edit. Still needed, in order:

1. **`respond()`** (currently posts `{ body: reply }` and stops): change
   to a two-step submit —
   ```ts
   async function respond(ticket: SupportTicket) {
     if (!reply.trim()) return;
     setBusy(true);
     setError(null);
     try {
       const res = await api.post<{ ticket: SupportTicket; messageId: string }>(
         `/support/tickets/${ticket.id}/messages`,
         { body: reply },
       );
       if (attachmentFile) {
         await uploadMessageAttachment(ticket.id, res.messageId, attachmentFile);
       }
       setReply("");
       setAttachmentFile(null);
       await load();
     } catch (err) {
       setError(err instanceof ApiError ? err.message : "The response could not be saved.");
     } finally {
       setBusy(false);
     }
   }
   ```
2. **Reply box** (line ~229 currently): replace
   `<Field label="Response"><Textarea rows={4} value={reply} onChange={...} /></Field>`
   with `RichTextEditor` + `AttachmentUpload` side by side, e.g.:
   ```tsx
   <Field label="Response">
     <RichTextEditor value={reply} onChange={setReply} placeholder="Write a response..." />
   </Field>
   <div className="mt-2 flex items-center justify-between gap-3">
     <AttachmentUpload file={attachmentFile} disabled={busy} onFileChange={setAttachmentFile} onError={setAttachmentError} />
     {attachmentError && <span className="text-xs font-semibold text-drift-error">{attachmentError}</span>}
   </div>
   ```
3. **Past messages** (line ~221 currently): replace the plain
   `<div className="mt-1 whitespace-pre-wrap ...">{message.body}</div>`
   with `<RichText html={message.body} className="mt-1 text-sm leading-6" />`,
   and render `message.attachments` (if any) as small thumbnails below,
   each `<img src={`/support/tickets/${ticket.id}/messages/${message.id}/attachments/${a.id}/content`} />`
   wrapped so the API's `/platform-admin` prefix is respected (check how
   other image URLs in this console are built — `api-client.ts`'s base
   URL handling, not a raw fetch).
4. The ticket-creation modal's own "Issue" field (`form.body`, plain
   `<Textarea>`) is **out of scope** — only the reply composer was asked
   for rich text/attachments, not the original ticket body.

## Verification, once page.tsx is finished

- Live-check in the platform-admin dev server (was running on `:3011`
  throughout this session) — open a ticket, reply with bold/italic/a
  list, attach a PNG, confirm the formatting and thumbnail both survive a
  reload.
- `npx prisma migrate dev` is already applied locally — nothing further
  needed there unless the DB gets reset.

## One more loose end from a sibling task

`mobile/lib/features/onboarding/presentation/intro_carousel_screen.dart`
has a one-line brand-blue color fix (`0xFF1C91D0` → `0xFF3399CC`, matching
the logo-color-match work in PR #10) sitting **uncommitted, interleaved
with your own in-progress Montserrat font/animation rebrand** in that same
file (confirmed via diff — the rest of that file's changes are yours, not
this session's). Left out of PR #10 deliberately rather than risk sweeping
your unfinished work into an unrelated commit. Worth carrying that one
color line forward whenever you commit the Montserrat work.
