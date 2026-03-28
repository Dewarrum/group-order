import { auth } from "@clerk/nextjs/server";
import { DashboardShell } from "@/components/splitit/DashboardShell";
import { redirectToSignIn } from "@/lib/redirect";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirectToSignIn("/");
  }

  return <DashboardShell />;
}
