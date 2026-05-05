import { PageShell } from "@/components/layout/page-shell";
import { JojoChat } from "@/components/jojo/jojo-chat";

export default async function JojoPage({
  searchParams,
}: {
  searchParams: Promise<{ scheduleJobId?: string }>;
}) {
  const { scheduleJobId } = await searchParams;

  return (
    <PageShell
      title="JoJo"
      description={<span className="text-sm text-[#6b7280]">Your AI assistant</span>}
    >
      <JojoChat scheduleJobId={scheduleJobId} />
    </PageShell>
  );
}
