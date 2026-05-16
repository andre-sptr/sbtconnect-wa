import { InboxClient } from "@/components/inbox-client";
import { requireSession } from "@/lib/auth";

export default async function InboxPage() {
  const session = await requireSession();
  return <InboxClient currentUser={session.username} />;
}
