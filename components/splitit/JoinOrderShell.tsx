"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  BottomNav,
  Card,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  SplitItShell,
  StatusBadge,
} from "./shared";

export function JoinOrderShell({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const preview = useQuery(api.orders.invitePreview, { inviteCode });
  const joinOrder = useMutation(api.orders.joinOrder);
  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const displayName = displayNameDraft ?? preview?.currentDisplayName ?? "";

  function openExistingOrder() {
    if (preview?.orderId) {
      router.push(`/orders/${preview.orderId}`);
    }
  }

  function handleJoin() {
    setError(null);

    startTransition(async () => {
      try {
        const result = await joinOrder({
          displayName,
          inviteCode,
        });
        router.push(`/orders/${result.orderId}`);
      } catch (joinError) {
        setError(joinError instanceof Error ? joinError.message : "Unable to join this order.");
      }
    });
  }

  if (!preview) {
    return (
      <SplitItShell footer={<BottomNav items={[{ href: "/", label: "Create" }, { active: true, label: "Join" }, { href: "/", label: "Activity" }]} />}>
        <div className="splitit-loading-card">Loading invite...</div>
      </SplitItShell>
    );
  }

  if (preview.status !== "open" && preview.membershipStatus == null) {
    return (
      <SplitItShell footer={<BottomNav items={[{ href: "/", label: "Create" }, { active: true, label: "Join" }, { href: "/", label: "Activity" }]} />}>
        <Card className="join-focus-card">
          <SectionLabel>Invitation</SectionLabel>
          <h1>{preview.title}</h1>
          <p>This order is no longer accepting new members.</p>
        </Card>
      </SplitItShell>
    );
  }

  const alreadyJoined = preview.membershipStatus === "active";

  return (
    <SplitItShell
      footer={
        <BottomNav
          items={[
            { href: "/", label: "Create" },
            { active: true, label: "Join" },
            { href: "/", label: "Activity" },
          ]}
        />
      }
    >
      <Card className="join-focus-card">
        <div className="join-focus-header">
          <SectionLabel>Invitation</SectionLabel>
          <h1>{preview.title}</h1>
          <p>
            Hosted by {preview.hostName} • {preview.activeMemberCount} people already inside
          </p>
        </div>

        <div className="join-status-row">
          <StatusBadge tone={alreadyJoined ? "success" : "neutral"}>
            {alreadyJoined ? "Already joined" : "Open lobby"}
          </StatusBadge>
        </div>

        <label className="input-label" htmlFor="display-name">
          Your name
        </label>
        <input
          className="splitit-input splitit-input-large"
          id="display-name"
          maxLength={40}
          onChange={(event) => setDisplayNameDraft(event.target.value)}
          placeholder="How should we call you?"
          value={displayName}
        />

        {error ? <p className="form-error">{error}</p> : null}

        <div className="join-actions">
          {alreadyJoined ? (
            <PrimaryButton onClick={openExistingOrder} type="button">
              Open group order
            </PrimaryButton>
          ) : (
            <PrimaryButton disabled={!displayName.trim() || isPending} onClick={handleJoin} type="button">
              {isPending ? "Joining..." : "Join group order"}
            </PrimaryButton>
          )}
          <SecondaryButton onClick={() => router.push("/")} type="button">
            Back to dashboard
          </SecondaryButton>
        </div>
        <p className="join-footnote">
          By joining, you agree to share your order notes and settlement details with the group.
        </p>
      </Card>
    </SplitItShell>
  );
}
