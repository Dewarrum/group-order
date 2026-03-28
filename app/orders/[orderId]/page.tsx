import { auth } from "@clerk/nextjs/server";
import type { Id } from "@/convex/_generated/dataModel";
import { ConvexClientProvider } from "@/components/ConvexClientProvider";
import { OrderRoomShell } from "@/components/splitit/OrderRoomShell";
import { redirectToSignIn } from "@/lib/redirect";

export default async function OrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { userId } = await auth();
  const { orderId } = await params;

  if (!userId) {
    redirectToSignIn(`/orders/${orderId}`);
  }

  return (
    <ConvexClientProvider>
      <OrderRoomShell orderId={orderId as Id<"orders">} />
    </ConvexClientProvider>
  );
}
