"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/convex/_generated/api";
import { formatMoney } from "@/lib/currency";
import { generateInviteCode } from "@/lib/invite";
import {
  BottomNav,
  Card,
  CopyIcon,
  EmptyState,
  PrimaryButton,
  QuietButton,
  SecondaryButton,
  SectionLabel,
  ShareIcon,
  SplitItShell,
  StatusBadge,
} from "./shared";

export function DashboardShell() {
  const router = useRouter();
  const dashboard = useQuery(api.orders.dashboard, {});
  const createOrder = useMutation(api.orders.createOrder);
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [title, setTitle] = useState("");
  const featuredOrder = dashboard?.activeOrders[0] ?? null;
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const inviteUrl = useMemo(() => {
    if (!featuredOrder || !origin) {
      return "";
    }
    return `${origin}/join/${featuredOrder.inviteCode}`;
  }, [featuredOrder, origin]);

  async function handleCreateOrder() {
    const safeTitle = title.trim();
    if (!safeTitle) {
      return;
    }

    startTransition(async () => {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const result = await createOrder({
            inviteCode: generateInviteCode(),
            title: safeTitle,
          });
          router.push(`/orders/${result.orderId}`);
          return;
        } catch (error) {
          if (!(error instanceof Error) || !error.message.includes("Invite code already exists")) {
            throw error;
          }
        }
      }
      throw new Error("Unable to create an invite code after several attempts.");
    });
  }

  async function handleCopy() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  if (!dashboard) {
    return (
      <SplitItShell subtitle="Dashboard Overview">
        <div className="splitit-loading-card">Loading your orders...</div>
      </SplitItShell>
    );
  }

  return (
    <SplitItShell
      subtitle="Dashboard Overview"
      footer={
        <BottomNav
          items={[
            { active: true, href: "/", label: "Create" },
            { href: featuredOrder ? `/join/${featuredOrder.inviteCode}` : "/", label: "Join" },
            { href: "#history", label: "Activity" },
          ]}
        />
      }
    >
      <section className="hero-copy">
        <SectionLabel>Dashboard Overview</SectionLabel>
        <h1>
          Welcome back,
          <br />
          {dashboard.viewerName}.
        </h1>
      </section>

      {featuredOrder ? (
        <Card className="hero-order-card">
          <div className="hero-order-copy">
            <StatusBadge tone={featuredOrder.status === "locked" ? "warning" : "success"}>
              {featuredOrder.status === "locked" ? "Locked" : "Active order"}
            </StatusBadge>
            <div>
              <h2>{featuredOrder.title}</h2>
              <p>
                {featuredOrder.isHost ? "Organized by you" : "Joined by you"} •{" "}
                {featuredOrder.activeMemberCount} people active
              </p>
            </div>
            <div className="meter-copy">
              <span>
                {featuredOrder.totalAmountMinor == null
                  ? "Awaiting total"
                  : formatMoney(featuredOrder.totalAmountMinor, featuredOrder.currencyCode)}
              </span>
              <span>
                {featuredOrder.status === "settled"
                  ? "Settled"
                  : `${featuredOrder.activeMemberCount} members`}
              </span>
            </div>
            <div className="split-meter">
              <span
                style={{
                  width:
                    featuredOrder.status === "settled"
                      ? "100%"
                      : featuredOrder.status === "locked"
                        ? "72%"
                        : "54%",
                }}
              />
            </div>
          </div>
          <div className="hero-order-actions">
            <Link className="button-primary" href={`/orders/${featuredOrder.orderId}`}>
              View details
            </Link>
            <button
              aria-label="Copy invite link"
              className="icon-button"
              onClick={handleCopy}
              type="button"
            >
              <ShareIcon />
            </button>
          </div>
        </Card>
      ) : (
        <EmptyState
          body="Start a fresh room, share the link, and SplitIt will keep the guest list and settlement ready."
          title="No active order yet"
        />
      )}

      {featuredOrder ? (
        <Card className="share-card">
          <div className="share-card-copy">
            <SectionLabel>Share Access</SectionLabel>
            <div className="share-link-row">
              <div>
                <p className="share-label">Group Invite Code</p>
                <p className="share-value">{inviteUrl || featuredOrder.inviteCode}</p>
              </div>
              <SecondaryButton onClick={handleCopy} type="button">
                {copied ? "Copied" : "Copy"}
              </SecondaryButton>
            </div>
          </div>
          {inviteUrl ? (
            <div className="qr-panel">
              <QRCodeSVG
                bgColor="transparent"
                fgColor="#0c7a54"
                size={108}
                value={inviteUrl}
              />
            </div>
          ) : null}
        </Card>
      ) : null}

      <Card className="create-card">
        <SectionLabel>Create New Order</SectionLabel>
        <div className="create-row">
          <input
            className="splitit-input"
            maxLength={80}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Friday Night Sushi"
            value={title}
          />
          <PrimaryButton disabled={!title.trim() || isPending} onClick={handleCreateOrder} type="button">
            {isPending ? "Creating..." : "Create"}
          </PrimaryButton>
        </div>
      </Card>

      <section className="history-section" id="history">
        <div className="history-header">
          <SectionLabel>History</SectionLabel>
          <QuietButton disabled type="button">
            View all
          </QuietButton>
        </div>
        {dashboard.recentOrders.length === 0 ? (
          <Card className="history-empty">
            <p>Your settled orders will appear here.</p>
          </Card>
        ) : (
          <div className="history-list">
            {dashboard.recentOrders.map((order) => (
              <Link className="history-item" href={`/orders/${order.orderId}`} key={order.orderId}>
                <div className="history-item-mark">
                  <CopyIcon />
                </div>
                <div className="history-item-copy">
                  <div>
                    <h3>{order.title}</h3>
                    <p>
                      {order.settledAt
                        ? new Intl.DateTimeFormat("en", {
                            dateStyle: "medium",
                          }).format(order.settledAt)
                        : "Completed"}
                    </p>
                  </div>
                  <strong>{formatMoney(order.totalAmountMinor, order.currencyCode)}</strong>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </SplitItShell>
  );
}
