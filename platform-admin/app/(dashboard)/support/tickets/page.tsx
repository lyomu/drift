"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DefinitionList, DetailRail, ModalShell, RowCard, StatBand } from "@/components/dashboard-design";
import { api, ApiError } from "@/lib/api-client";
import type { SupportStaff, SupportTicket, SupportTicketCategory, SupportTicketPriority, SupportTicketStatus } from "@/lib/support-types";
import { dateTime, label, personName } from "@/lib/support-types";
import { Badge, Button, Card, EmptyState, ErrorBanner, Field, Input, PageHeader, Select, Textarea, statusTone } from "@/components/ui";

type TicketForm = {
  userId: string;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
};

const EMPTY_FORM: TicketForm = {
  userId: "",
  subject: "",
  body: "",
  category: "OTHER",
  priority: "NORMAL",
};

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [staff, setStaff] = useState<SupportStaff[]>([]);
  const [status, setStatus] = useState<SupportTicketStatus | "">("OPEN");
  const [priority, setPriority] = useState<SupportTicketPriority | "">("");
  const [assignedToId, setAssignedToId] = useState("");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState<TicketForm>(EMPTY_FORM);
  const [showCreate, setShowCreate] = useState(false);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = useMemo(
    () => tickets?.find((ticket) => ticket.id === selectedId) ?? tickets?.[0] ?? null,
    [selectedId, tickets],
  );

  const counts = useMemo(() => ({
    open: tickets?.filter((ticket) => ticket.status === "OPEN").length ?? 0,
    assigned: tickets?.filter((ticket) => ticket.status === "ASSIGNED").length ?? 0,
    resolved: tickets?.filter((ticket) => ticket.status === "RESOLVED").length ?? 0,
  }), [tickets]);

  const load = useCallback(async () => {
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (priority) params.set("priority", priority);
      if (assignedToId) params.set("assignedToId", assignedToId);
      if (search.trim()) params.set("search", search.trim());
      const response = await api.get<{ tickets: SupportTicket[]; staff: SupportStaff[] }>(`/support/tickets?${params.toString()}`);
      setTickets(response.tickets);
      setStaff(response.staff);
      if (selectedId && !response.tickets.some((ticket) => ticket.id === selectedId)) setSelectedId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Support tickets could not be loaded.");
    }
  }, [assignedToId, priority, search, selectedId, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function createTicket(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await api.post<{ ticket: SupportTicket }>("/support/tickets", {
        userId: form.userId || null,
        subject: form.subject,
        body: form.body,
        category: form.category,
        priority: form.priority,
      });
      setForm(EMPTY_FORM);
      setSelectedId(response.ticket.id);
      setShowCreate(false);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ticket could not be opened.");
    } finally {
      setBusy(false);
    }
  }

  async function assign(ticket: SupportTicket, assigneeId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/support/tickets/${ticket.id}/assign`, { assignedToId: assigneeId || null });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ticket could not be assigned.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(ticket: SupportTicket) {
    if (!reply.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/support/tickets/${ticket.id}/messages`, { body: reply });
      setReply("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The response could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function close(ticket: SupportTicket) {
    const resolutionNote = window.prompt(`Resolution note for ${ticket.subject}`);
    if (!resolutionNote?.trim()) return;
    if (!window.confirm(`Resolve ticket ${ticket.subject}?`)) return;
    setBusy(true);
    setError(null);
    try {
      await api.post(`/support/tickets/${ticket.id}/close`, { resolutionNote });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "The ticket could not be resolved.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Support Tickets"
        description="Internal support queue for player, billing, club, match, and technical issues."
        action={<Button icon="confirmation_number" onClick={() => setShowCreate(true)}>Open ticket</Button>}
      />
      <ErrorBanner message={error} />

      <StatBand
        stats={[
          { label: "Open", value: counts.open, icon: "pending_actions", tone: "amber" },
          { label: "Assigned", value: counts.assigned, icon: "assignment_ind", tone: "blue" },
          { label: "Resolved", value: counts.resolved, icon: "task_alt", tone: "green" },
        ]}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>
          <Card className="mb-4 p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_160px_160px_200px_auto]">
              <Field label="Search"><Input value={search} onChange={(event) => { setSearch(event.target.value); setTickets(null); }} placeholder="Subject, body, or user" /></Field>
              <Field label="Status"><Select value={status} onChange={(event) => { setStatus(event.target.value as SupportTicketStatus | ""); setTickets(null); }}><option value="">Any status</option><option value="OPEN">Open</option><option value="ASSIGNED">Assigned</option><option value="RESOLVED">Resolved</option></Select></Field>
              <Field label="Priority"><Select value={priority} onChange={(event) => { setPriority(event.target.value as SupportTicketPriority | ""); setTickets(null); }}><option value="">Any priority</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></Select></Field>
              <Field label="Assignee"><Select value={assignedToId} onChange={(event) => { setAssignedToId(event.target.value); setTickets(null); }}><option value="">Any assignee</option><option value="UNASSIGNED">Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{personName(person)}</option>)}</Select></Field>
              <div className="flex items-end"><Button type="button" variant="secondary" icon="refresh" onClick={() => void load()}>Refresh</Button></div>
            </div>
          </Card>

          {tickets === null && !error && <EmptyState message="Loading support tickets..." />}
          {tickets?.length === 0 && <EmptyState message={status === "OPEN" && !priority && !assignedToId && !search.trim() ? "No open tickets" : "No support tickets match these filters."} />}
          {tickets && tickets.length > 0 && (
            <div className="grid gap-3">
              {tickets.map((ticket) => (
                <RowCard key={ticket.id} selected={selected?.id === ticket.id}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-bold text-drift-text-primary">{ticket.subject}</div>
                      <div className="mt-1 text-xs font-semibold text-drift-text-secondary">{label(ticket.category)} / {label(ticket.priority)}</div>
                      <div className="mt-2 text-sm text-drift-text-secondary">
                        {ticket.user ? <Link href={`/users?query=${encodeURIComponent(ticket.user.email ?? ticket.user.id)}`} className="font-bold text-drift-primary hover:underline">{personName(ticket.user)}</Link> : "Unlinked"}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge tone={statusTone(ticket.status)}>{label(ticket.status)}</Badge>
                      <span className="text-xs font-semibold text-drift-text-secondary">{dateTime(ticket.updatedAt)}</span>
                      <button className="text-sm font-bold text-drift-primary hover:underline" onClick={() => setSelectedId(ticket.id)}>Open</button>
                    </div>
                  </div>
                </RowCard>
              ))}
            </div>
          )}
        </div>

        {selected ? (
          <DetailRail
            title={selected.subject}
            eyebrow="Ticket detail"
            actions={<Badge tone={statusTone(selected.status)}>{label(selected.status)}</Badge>}
          >
            <DefinitionList
              rows={[
                { label: "User", value: personName(selected.user) },
                { label: "Assignee", value: personName(selected.assignedTo) },
                { label: "Created", value: dateTime(selected.createdAt) },
                { label: "Updated", value: dateTime(selected.updatedAt) },
              ]}
            />
            <p className="mt-5 whitespace-pre-wrap rounded-xl bg-drift-background p-3 text-sm leading-6 text-drift-text-primary">{selected.body}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto]">
              <Field label="Assign"><Select disabled={selected.status === "RESOLVED" || busy} value={selected.assignedToId ?? ""} onChange={(event) => void assign(selected, event.target.value)}><option value="">Unassigned</option>{staff.map((person) => <option key={person.id} value={person.id}>{personName(person)}</option>)}</Select></Field>
              {selected.status !== "RESOLVED" && <div className="flex items-end"><Button variant="destructive" icon="task_alt" disabled={busy} onClick={() => void close(selected)}>Close</Button></div>}
            </div>
            <div className="mt-5">
              <h3 className="text-[12px] font-bold uppercase tracking-[0.08em] text-drift-text-secondary">Responses</h3>
              {selected.messages.length === 0 && <div className="mt-2 rounded-xl border border-dashed border-drift-border px-4 py-6 text-sm text-drift-text-secondary">No responses yet.</div>}
              <div className="mt-2 space-y-3">
                {selected.messages.map((message) => (
                  <div key={message.id} className="rounded-xl border border-drift-border px-3 py-2">
                    <div className="text-xs font-bold text-drift-text-secondary">{personName(message.actor)} / {dateTime(message.createdAt)}</div>
                    <div className="mt-1 whitespace-pre-wrap text-sm leading-6 text-drift-text-primary">{message.body}</div>
                  </div>
                ))}
              </div>
            </div>
            {selected.resolutionNote && <div className="mt-4 rounded-xl border border-drift-success/30 bg-drift-success-surface px-4 py-3 text-sm text-drift-success">Resolution: {selected.resolutionNote}</div>}
            {selected.status !== "RESOLVED" && (
              <div className="mt-5">
                <Field label="Response"><Textarea rows={4} value={reply} onChange={(event) => setReply(event.target.value)} /></Field>
                <Button className="mt-3" icon="send" disabled={busy || !reply.trim()} onClick={() => void respond(selected)}>{busy ? "Saving..." : "Respond"}</Button>
              </div>
            )}
          </DetailRail>
        ) : (
          <Card><EmptyState message="Select a ticket to inspect the request, assignee, and response history." /></Card>
        )}
      </div>

      {showCreate && (
        <ModalShell
          title="Open ticket"
          description="Create a support ticket on behalf of a player, club, or internal staff member."
          onClose={() => setShowCreate(false)}
        >
          <form onSubmit={createTicket} className="flex flex-col gap-4">
            <Field label="Linked user ID"><Input value={form.userId} onChange={(event) => setForm((current) => ({ ...current, userId: event.target.value }))} placeholder="Optional" /></Field>
            <Field label="Subject"><Input required value={form.subject} onChange={(event) => setForm((current) => ({ ...current, subject: event.target.value }))} /></Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Category"><Select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value as SupportTicketCategory }))}><option value="ACCOUNT">Account</option><option value="BILLING">Billing</option><option value="MATCHES">Matches</option><option value="CLUBS">Clubs</option><option value="TECHNICAL">Technical</option><option value="OTHER">Other</option></Select></Field>
              <Field label="Priority"><Select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value as SupportTicketPriority }))}><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></Select></Field>
            </div>
            <Field label="Issue"><Textarea required rows={5} value={form.body} onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))} /></Field>
            <Button type="submit" icon="add" disabled={busy}>{busy ? "Opening..." : "Open ticket"}</Button>
          </form>
        </ModalShell>
      )}
    </div>
  );
}
