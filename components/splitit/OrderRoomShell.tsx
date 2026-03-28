"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { api } from "@/convex/_generated/api";
import { COMMON_CURRENCIES, formatMoney, parseMoneyToMinorUnits } from "@/lib/currency";
import {
  BottomNav,
  Card,
  CopyIcon,
  EmptyState,
  LockIcon,
  PrimaryButton,
  QuietButton,
  SecondaryButton,
  SectionLabel,
  SplitItShell,
  StatusBadge,
} from "./shared";

function MemberRow({
  canRemove,
  isViewer,
  member,
  onRemove,
}: {
  canRemove: boolean;
  isViewer: boolean;
  member: NonNullable<ReturnType<typeof useQuery<typeof api.orders.orderDetail>>>["members"][number];
  onRemove: (memberId: Id<"orderMembers">) => void;
}) {
  return (
    <article className={`member-row ${member.status !== "active" ? "inactive" : ""}`}>
      <div className="member-avatar">{member.displayName.slice(0, 1).toUpperCase()}</div>
      <div className="member-copy">
        <div className="member-heading">
          <h3>{member.displayName}</h3>
          <div className="member-badges">
            {member.role === "host" ? <StatusBadge tone="success">Host</StatusBadge> : null}
            {isViewer ? <StatusBadge>You</StatusBadge> : null}
            {member.status !== "active" ? <StatusBadge tone="warning">{member.status}</StatusBadge> : null}
          </div>
        </div>
        <div className="chip-row">
          {member.preferences.length === 0 ? (
            <span className="preference-empty">No preferences yet</span>
          ) : (
            member.preferences.map((preference) => (
              <span className="preference-chip" key={preference._id}>
                {preference.text}
              </span>
            ))
          )}
        </div>
      </div>
      <div className="member-meta">
        {member.amountMinor != null ? <strong>{formatMoney(member.amountMinor, null)}</strong> : null}
        {canRemove ? (
          <QuietButton onClick={() => onRemove(member.memberId)} type="button">
            Remove
          </QuietButton>
        ) : null}
      </div>
    </article>
  );
}

export function OrderRoomShell({ orderId }: { orderId: Id<"orders"> }) {
  const order = useQuery(api.orders.orderDetail, { orderId });
  const addPreferenceItem = useMutation(api.orders.addPreferenceItem);
  const leaveOrder = useMutation(api.orders.leaveOrder);
  const lockOrder = useMutation(api.orders.lockOrder);
  const removeParticipant = useMutation(api.orders.removeParticipant);
  const removePreferenceItem = useMutation(api.orders.removePreferenceItem);
  const settleOrder = useMutation(api.orders.settleOrder);
  const updateDisplayName = useMutation(api.orders.updateDisplayName);

  const [displayNameDraft, setDisplayNameDraft] = useState<string | null>(null);
  const [newPreference, setNewPreference] = useState("");
  const [amount, setAmount] = useState("");
  const [currencyDraft, setCurrencyDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const displayName = displayNameDraft ?? order?.viewer.displayName ?? "";
  const currencyCode = currencyDraft ?? order?.currencyCode ?? "USD";

  const inviteUrl = useMemo(() => {
    if (!order || !origin) {
      return "";
    }
    return `${origin}/join/${order.inviteCode}`;
  }, [order, origin]);

  if (!order) {
    return (
      <SplitItShell subtitle="Order room">
        <EmptyState
          body="This order either does not exist or you are not a member of it."
          title="Order unavailable"
        />
      </SplitItShell>
    );
  }

  const activeMembers = order.members.filter((member) => member.status === "active");
  const viewerMember = order.members.find((member) => member.memberId === order.viewer.memberId) ?? null;
  const isHost = order.viewer.role === "host";

  async function runMutation(task: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await task();
      } catch (mutationError) {
        setError(mutationError instanceof Error ? mutationError.message : "Something went wrong.");
      }
    });
  }

  function handleDisplayNameSave() {
    void runMutation(async () => {
      await updateDisplayName({ displayName, orderId });
    });
  }

  function handleAddPreference() {
    void runMutation(async () => {
      await addPreferenceItem({ orderId, text: newPreference });
      setNewPreference("");
    });
  }

  function handleRemovePreference(preferenceItemId: Id<"preferenceItems">) {
    void runMutation(async () => {
      await removePreferenceItem({ orderId, preferenceItemId });
    });
  }

  function handleRemoveMember(memberId: Id<"orderMembers">) {
    void runMutation(async () => {
      await removeParticipant({ memberId, orderId });
    });
  }

  function handleLeave() {
    void runMutation(async () => {
      await leaveOrder({ orderId });
    });
  }

  function handleLock() {
    void runMutation(async () => {
      await lockOrder({ orderId });
    });
  }

  function handleSettle() {
    void runMutation(async () => {
      await settleOrder({
        currencyCode,
        orderId,
        totalAmountMinor: parseMoneyToMinorUnits(amount, currencyCode),
      });
    });
  }

  async function handleCopyLink() {
    if (!inviteUrl) {
      return;
    }
    await navigator.clipboard.writeText(inviteUrl);
  }

  return (
    <SplitItShell
      subtitle="Live room"
      title={
        <div className="order-title-block">
          <span className="order-title-dot" />
          <span>{order.title}</span>
        </div>
      }
      footer={
        <BottomNav
          items={[
            { active: order.status === "open", href: `/orders/${orderId}`, label: "Lobby" },
            { active: order.status === "locked", href: `/orders/${orderId}`, label: "Finalize" },
            { active: order.status === "settled", href: `/orders/${orderId}`, label: "Results" },
          ]}
        />
      }
    >
      <section className="lobby-status">
        <div className="lobby-status-heading">
          <SectionLabel>Lobby Status</SectionLabel>
          <h1>{order.status === "open" ? "Collecting" : order.status === "locked" ? "Locked" : "Settled"}</h1>
        </div>
        <div className="split-meter">
          <span
            style={{
              width: order.status === "open" ? "42%" : order.status === "locked" ? "74%" : "100%",
            }}
          />
        </div>
        <p>
          {order.status === "open"
            ? "The group is still adding preferences. Update your name or food notes before the host locks the order."
            : order.status === "locked"
              ? "Choices are frozen. The host can now enter the paid total and currency to calculate the split."
              : "The final split is ready. Each guest can now see what they owe the host."}
        </p>
      </section>

      <div className="stack-grid">
        <Card className="share-card">
          <SectionLabel>Share Access</SectionLabel>
          <div className="share-link-row">
            <div>
              <p className="share-label">Invite link</p>
              <p className="share-value">{inviteUrl || order.inviteCode}</p>
            </div>
            <SecondaryButton onClick={handleCopyLink} type="button">
              Copy
            </SecondaryButton>
          </div>
          {inviteUrl ? (
            <div className="qr-panel compact">
              <QRCodeSVG
                bgColor="transparent"
                fgColor="#0c7a54"
                size={92}
                value={inviteUrl}
              />
            </div>
          ) : null}
        </Card>

        <Card>
          <SectionLabel>Your identity</SectionLabel>
          <div className="create-row">
            <input
              className="splitit-input"
              disabled={order.status !== "open" || order.viewer.status !== "active"}
              maxLength={40}
              onChange={(event) => setDisplayNameDraft(event.target.value)}
              value={displayName}
            />
            <SecondaryButton
              disabled={order.status !== "open" || !displayName.trim() || isPending}
              onClick={handleDisplayNameSave}
              type="button"
            >
              Save
            </SecondaryButton>
          </div>
        </Card>
      </div>

      <Card>
        <div className="members-header">
          <SectionLabel>Participants</SectionLabel>
          <span>{activeMembers.length} active</span>
        </div>
        <div className="members-list">
          {order.members.map((member) => (
            <MemberRow
              canRemove={isHost && order.status === "open" && member.role !== "host" && member.status === "active"}
              isViewer={member.memberId === order.viewer.memberId}
              key={member.memberId}
              member={member}
              onRemove={handleRemoveMember}
            />
          ))}
        </div>
      </Card>

      {viewerMember && viewerMember.status === "active" ? (
        <Card>
          <SectionLabel>Your preferences</SectionLabel>
          <div className="create-row">
            <input
              className="splitit-input"
              disabled={order.status !== "open"}
              maxLength={120}
              onChange={(event) => setNewPreference(event.target.value)}
              placeholder="Pepperoni pizza, no onions..."
              value={newPreference}
            />
            <PrimaryButton
              disabled={order.status !== "open" || !newPreference.trim() || isPending}
              onClick={handleAddPreference}
              type="button"
            >
              Add
            </PrimaryButton>
          </div>
          <div className="chip-row chip-row-large">
            {viewerMember.preferences.map((preference) => (
              <button
                className="preference-chip removable"
                disabled={order.status !== "open"}
                key={preference._id}
                onClick={() => handleRemovePreference(preference._id)}
                type="button"
              >
                {preference.text}
                <span aria-hidden="true">×</span>
              </button>
            ))}
            {viewerMember.preferences.length === 0 ? (
              <span className="preference-empty">No preference items yet.</span>
            ) : null}
          </div>
        </Card>
      ) : null}

      {error ? <p className="form-error">{error}</p> : null}

      {order.status === "open" ? (
        <Card className="action-card">
          {isHost ? (
            <>
              <div className="action-heading">
                <LockIcon />
                <div>
                  <h2>Lock group choices</h2>
                  <p>Freeze the participant list and prepare the final bill entry.</p>
                </div>
              </div>
              <PrimaryButton disabled={isPending} onClick={handleLock} type="button">
                {isPending ? "Locking..." : "Lock order"}
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="action-heading">
                <CopyIcon />
                <div>
                  <h2>Need to step out?</h2>
                  <p>You can leave the lobby while it is still open.</p>
                </div>
              </div>
              <SecondaryButton disabled={isPending} onClick={handleLeave} type="button">
                Leave group
              </SecondaryButton>
            </>
          )}
        </Card>
      ) : null}

      {order.status === "locked" ? (
        <Card className="settlement-card">
          <SectionLabel>Finalize & lock order</SectionLabel>
          {isHost ? (
            <>
              <div className="settlement-fields">
                <label className="input-label" htmlFor="currency-select">
                  Select currency
                </label>
                <select
                  className="splitit-select"
                  id="currency-select"
                  onChange={(event) => setCurrencyDraft(event.target.value)}
                  value={currencyCode}
                >
                  {COMMON_CURRENCIES.map((currency) => (
                    <option key={currency.code} value={currency.code}>
                      {currency.code} - {currency.label}
                    </option>
                  ))}
                </select>
                <label className="input-label" htmlFor="total-amount">
                  Total amount
                </label>
                <input
                  className="splitit-input splitit-input-large"
                  id="total-amount"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                  value={amount}
                />
              </div>
              <div className="settlement-preview">
                <span>Split progress</span>
                <strong>
                  {activeMembers.length} people •{" "}
                  {amount.trim() ? formatMoney(parseMoneyToMinorUnits(amount, currencyCode), currencyCode) : "Pending"}
                </strong>
              </div>
              <div className="split-meter">
                <span style={{ width: "78%" }} />
              </div>
              <PrimaryButton disabled={!amount.trim() || isPending} onClick={handleSettle} type="button">
                {isPending ? "Calculating..." : "Calculate split & lock"}
              </PrimaryButton>
            </>
          ) : (
            <p className="settlement-waiting">The host is finalizing the payment total. Results will appear here when ready.</p>
          )}
        </Card>
      ) : null}

      {order.status === "settled" ? (
        <>
          <div className="summary-grid">
            <Card className="summary-card">
              <SectionLabel>Total</SectionLabel>
              <h2>{formatMoney(order.totalAmountMinor, order.currencyCode)}</h2>
            </Card>
            <Card className="summary-card">
              <SectionLabel>Your share</SectionLabel>
              <h2>{formatMoney(viewerMember?.amountMinor ?? null, order.currencyCode)}</h2>
            </Card>
            <Card className="summary-card">
              <SectionLabel>Owe host</SectionLabel>
              <h2>{formatMoney(viewerMember?.owedToHostMinor ?? null, order.currencyCode)}</h2>
            </Card>
          </div>
          <Card>
            <div className="members-header">
              <SectionLabel>Settlement</SectionLabel>
              <span>Host: {order.hostName}</span>
            </div>
            <div className="settlement-list">
              {order.members.map((member) => (
                <div className="settlement-item" key={member.memberId}>
                  <div>
                    <strong>{member.displayName}</strong>
                    <p>{member.role === "host" ? "Covered by host payment" : "Owes the host"}</p>
                  </div>
                  <div className="settlement-amounts">
                    <span>{formatMoney(member.amountMinor, order.currencyCode)}</span>
                    <strong>{formatMoney(member.owedToHostMinor, order.currencyCode)}</strong>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </>
      ) : null}

      <div className="order-footer-links">
        <Link href="/">Back to dashboard</Link>
      </div>
    </SplitItShell>
  );
}
