import { PageShell } from "@/components/layout/page-shell";
import { JojoChat } from "@/components/jojo/jojo-chat";

export default function JojoPage() {
  return (
    <PageShell
      title="JoJo"
      description={<span className="text-sm text-[#6b7280]">Your AI assistant</span>}
    >
      <JojoChat />
    </PageShell>
  );
}
