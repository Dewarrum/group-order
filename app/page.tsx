import { auth } from "@clerk/nextjs/server";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { DashboardShell } from "@/components/splitit/DashboardShell";
import { redirectToSignIn } from "@/lib/redirect";

export default async function Home() {
  const { userId } = await auth();

  if (!userId) {
    redirectToSignIn("/");
  }

  return (
    <ConvexClientProvider>
      <DashboardShell />
    </ConvexClientProvider>
  );
}
