import { redirect } from "next/navigation";

// Self-service account signup was replaced by the club-request → approval →
// magic-link setup flow. Anything still pointing here lands on the request form.
export default function SignupRedirect() {
  redirect("/request-club");
}
