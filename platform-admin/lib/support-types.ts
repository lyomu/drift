export type SupportTicketStatus = "OPEN" | "ASSIGNED" | "RESOLVED";
export type SupportTicketPriority = "NORMAL" | "HIGH" | "URGENT";
export type SupportTicketCategory = "ACCOUNT" | "BILLING" | "MATCHES" | "CLUBS" | "TECHNICAL" | "OTHER";
export type PrivacyRequestType = "EXPORT" | "DELETION";
export type PrivacyRequestStatus = "PENDING" | "FULFILLED";

export const SUPPORT_DEPARTMENT_OPTIONS: { value: SupportTicketCategory; label: string }[] = [
  { value: "ACCOUNT", label: "Account" },
  { value: "BILLING", label: "Billing" },
  { value: "MATCHES", label: "Matches" },
  { value: "CLUBS", label: "Clubs" },
  { value: "TECHNICAL", label: "Technical" },
  { value: "OTHER", label: "Other" },
];

export type SupportUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  accountStatus: string;
  createdAt: string;
};

export type SupportStaff = {
  id: string;
  email: string;
  name: string | null;
};

export type SupportTicketMessageAttachment = {
  id: string;
  filename: string;
  mimeType: string;
  createdAt: string;
};

export type SupportTicketMessage = {
  id: string;
  body: string;
  createdAt: string;
  actor: SupportStaff;
  attachments: SupportTicketMessageAttachment[];
};

export type SupportTicket = {
  id: string;
  userId: string | null;
  user: SupportUser | null;
  subject: string;
  body: string;
  category: SupportTicketCategory;
  priority: SupportTicketPriority;
  status: SupportTicketStatus;
  assignedToId: string | null;
  assignedTo: SupportStaff | null;
  resolvedById: string | null;
  resolvedBy: SupportStaff | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  messages: SupportTicketMessage[];
};

export type PrivacyRequest = {
  id: string;
  userId: string;
  user: SupportUser;
  type: PrivacyRequestType;
  status: PrivacyRequestStatus;
  requestNote: string | null;
  fulfillmentNote: string | null;
  hasExportSnapshot: boolean;
  processedById: string | null;
  processedBy: SupportStaff | null;
  fulfilledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "None";
}

export function departmentLabel(value: SupportTicketCategory | string | null | undefined) {
  return SUPPORT_DEPARTMENT_OPTIONS.find((option) => option.value === value)?.label ?? label(value);
}

export function personName(person: SupportUser | SupportStaff | null | undefined) {
  if (!person) return "Unlinked";
  if ("firstName" in person) {
    return [person.firstName, person.lastName].filter(Boolean).join(" ") || person.email || "Deleted user";
  }
  return person.name || person.email;
}

export function dateTime(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "Not set";
}
