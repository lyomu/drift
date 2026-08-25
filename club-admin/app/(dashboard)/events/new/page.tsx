import { EventForm } from "@/components/EventForm";
import { PageHeader } from "@/components/ui";

export default function NewEventPage() {
  return <div><PageHeader title="Create event" description="Publish now or keep the event in draft until details are final." /><EventForm /></div>;
}
