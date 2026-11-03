import { EventForm } from "@/components/EventForm";
import { PageHeader } from "@/components/ui";
import { useT } from "@/lib/i18n/i18n-context";

export default function NewEventPage() {
  const t = useT();
  return <div><PageHeader title={t("a.createEvent")} description={t("a.publishNowOrKeepThe")} /><EventForm /></div>;
}
