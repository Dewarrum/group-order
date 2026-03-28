import { auth } from "@clerk/nextjs/server";
import { JoinOrderShell } from "@/components/splitit/JoinOrderShell";
import { redirectToSignIn } from "@/lib/redirect";

export default async function JoinOrderPage({
  params,
}: {
  params: Promise<{ inviteCode: string }>;
}) {
  const { userId } = await auth();
  const { inviteCode } = await params;

  if (!userId) {
    redirectToSignIn(`/join/${inviteCode}`);
  }

  return <JoinOrderShell inviteCode={inviteCode} />;
}
