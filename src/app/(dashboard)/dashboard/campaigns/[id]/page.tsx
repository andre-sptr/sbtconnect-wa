import { CampaignEditor } from "@/components/campaign-editor";
import { requireSession } from "@/lib/auth";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();
  return <CampaignEditor campaignId={Number(id)} currentUser={session.username} />;
}
