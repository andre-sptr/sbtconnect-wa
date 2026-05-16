import { CampaignEditor } from "@/components/campaign-editor";
import { requireSession } from "@/lib/auth";

export default async function NewCampaignPage() {
  const session = await requireSession();
  return <CampaignEditor currentUser={session.username} />;
}
