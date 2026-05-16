import { CampaignEditor } from "@/components/campaign-editor";

export default async function EditCampaignPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CampaignEditor campaignId={Number(id)} />;
}
