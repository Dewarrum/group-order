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

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 20.25 4.95 13.5a4.73 4.73 0 0 1 0-6.75 4.57 4.57 0 0 1 6.56 0L12 7.24l.49-.49a4.57 4.57 0 0 1 6.56 0 4.73 4.73 0 0 1 0 6.75z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M12 5.25v13.5M5.25 12h13.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

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
  const [isSettlementSheetDismissed, setIsSettlementSheetDismissed] = useState(false);
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

  const isHost = order?.viewer.role === "host";

  const amountPreviewMinor = useMemo(() => {
    if (!amount.trim()) {
      return null;
    }

    try {
      return parseMoneyToMinorUnits(amount, currencyCode);
    } catch {
      return null;
    }
  }, [amount, currencyCode]);

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
  const settledMembers = order.members.filter(
    (member) => member.status === "active" && member.amountMinor != null,
  );
  const viewerMember = order.members.find((member) => member.memberId === order.viewer.memberId) ?? null;
  const settledDate = order.settledAt
    ? new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(order.settledAt)
    : null;
  const isSettlementSheetOpen = order.status === "locked" && isHost && !isSettlementSheetDismissed;
  const activeParticipantPreview = activeMembers.slice(0, 3);
  const overflowParticipantCount = Math.max(activeMembers.length - activeParticipantPreview.length, 0);
  const groupedCuisineChoices = new Map<
    string,
    {
      label: string;
      requesters: string[];
      totalVotes: number;
    }
  >();

  for (const member of activeMembers) {
    for (const preference of member.preferences) {
      const label = preference.text.trim();
      if (!label) {
        continue;
      }

      const key = label.toLocaleLowerCase("en");
      const current = groupedCuisineChoices.get(key) ?? {
        label,
        requesters: [],
        totalVotes: 0,
      };

      current.totalVotes += 1;
      current.requesters.push(member.displayName);
      groupedCuisineChoices.set(key, current);
    }
  }

  const cuisineRanking = [...groupedCuisineChoices.values()]
    .sort((left, right) => {
      if (right.totalVotes !== left.totalVotes) {
        return right.totalVotes - left.totalVotes;
      }
      if (right.requesters.length !== left.requesters.length) {
        return right.requesters.length - left.requesters.length;
      }
      return left.label.localeCompare(right.label);
    })
    .map((item, index) => ({
      ...item,
      rank: index + 1,
      requesterSummary: item.requesters.join(", "),
    }));
  const footerItems =
    order.status === "open"
      ? [
          { active: true, href: `/orders/${orderId}`, label: "Vote" },
          { href: "#invite", label: "Invite" },
          { label: "Results" },
        ]
      : [
          { href: `/orders/${orderId}`, label: "Lobby" },
          { active: order.status === "locked", href: `/orders/${orderId}`, label: "Finalize" },
          { active: order.status === "settled", href: `/orders/${orderId}`, label: "Results" },
        ];

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
    if (amountPreviewMinor == null) {
      setError("Enter a valid amount.");
      return;
    }

    void runMutation(async () => {
      await settleOrder({
        currencyCode,
        orderId,
        totalAmountMinor: amountPreviewMinor,
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
        <BottomNav items={footerItems} />
      }
    >
      <section className={`lobby-status lobby-status-${order.status}`}>
        <div className="lobby-status-heading">
          <SectionLabel>
            {order.status === "open"
              ? "Active lobby"
              : order.status === "locked"
                ? "Locked order"
                : "Settlement summary"}
          </SectionLabel>
          <h1>{order.status === "open" ? "Voting" : order.status === "locked" ? "Locked" : "Settled"}</h1>
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
            ? "We're deciding on the cuisine. Cast your vote for the best category or add a new one."
            : order.status === "locked"
              ? "Choices are frozen. The host can now enter the paid total and currency in the finalize sheet to calculate the split."
              : "The final split is ready. Each guest can now see what they owe the host."}
        </p>
        {order.status === "settled" ? (
          <div className="settled-banner">
            <StatusBadge tone="success">{settledDate ? `Finalized ${settledDate}` : "Finalized"}</StatusBadge>
            <span>{isHost ? "You covered the order." : `Pay ${order.hostName} to close the loop.`}</span>
          </div>
        ) : null}
      </section>

      {order.status === "open" ? (
        <>
          <section className="voting-screen">
            <div className="voting-section-header">
              <SectionLabel>Cuisine ranking</SectionLabel>
            </div>
            {cuisineRanking.length === 0 ? (
              <Card className="voting-empty-card">
                <h2>No cuisine options yet</h2>
                <p>Start the shortlist by suggesting the first cuisine below.</p>
              </Card>
            ) : (
              <div className="voting-list">
                {cuisineRanking.map((choice, index) => (
                  <article className="vote-card" key={`${choice.label}-${index}`}>
                    <div className="vote-rank">{choice.rank}</div>
                    <div className="vote-copy">
                      <h3>{choice.label}</h3>
                      <p>Requested by {choice.requesterSummary}</p>
                    </div>
                    <div className="vote-score">
                      <HeartIcon filled={index === 0} />
                      <strong>{choice.totalVotes}</strong>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {viewerMember && viewerMember.status === "active" ? (
              <>
                <div className="vote-composer">
                  <input
                    className="vote-composer-input"
                    disabled={order.status !== "open"}
                    maxLength={120}
                    onChange={(event) => setNewPreference(event.target.value)}
                    placeholder="Suggest a new cuisine..."
                    value={newPreference}
                  />
                  <button
                    aria-label="Add cuisine suggestion"
                    className="vote-composer-button"
                    disabled={order.status !== "open" || !newPreference.trim() || isPending}
                    onClick={handleAddPreference}
                    type="button"
                  >
                    <PlusIcon />
                  </button>
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
                    <span className="preference-empty">Your cuisine picks will appear here.</span>
                  ) : null}
                </div>
              </>
            ) : null}

            <div className="voting-participants">
              <SectionLabel>Active participants</SectionLabel>
              <div className="participant-avatar-row">
                {activeParticipantPreview.map((member) => (
                  <div
                    aria-label={member.displayName}
                    className="participant-avatar-badge"
                    key={member.memberId}
                    title={member.displayName}
                  >
                    {member.displayName.slice(0, 1).toUpperCase()}
                  </div>
                ))}
                {overflowParticipantCount > 0 ? (
                  <div className="participant-avatar-badge participant-avatar-overflow">+{overflowParticipantCount}</div>
                ) : null}
              </div>
            </div>
          </section>

          <section className="stack-grid">
            <section id="invite">
              <Card className="share-card">
                <SectionLabel>Share access</SectionLabel>
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
            </section>

            <Card>
              <SectionLabel>Your identity</SectionLabel>
              <div className="create-row">
                <input
                  className="splitit-input"
                  disabled={order.viewer.status !== "active"}
                  maxLength={40}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  value={displayName}
                />
                <SecondaryButton
                  disabled={!displayName.trim() || isPending}
                  onClick={handleDisplayNameSave}
                  type="button"
                >
                  Save
                </SecondaryButton>
              </div>
            </Card>
          </section>

          <Card>
            <div className="members-header">
              <SectionLabel>Participants</SectionLabel>
              <span>{activeMembers.length} active</span>
            </div>
            <div className="members-list">
              {order.members.map((member) => (
                <MemberRow
                  canRemove={isHost && member.role !== "host" && member.status === "active"}
                  isViewer={member.memberId === order.viewer.memberId}
                  key={member.memberId}
                  member={member}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          </Card>
        </>
      ) : (
        <>
          <section className="stack-grid">
            <section id="invite">
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
            </section>

            <Card>
              <SectionLabel>Your identity</SectionLabel>
              <div className="create-row">
                <input
                  className="splitit-input"
                  disabled
                  maxLength={40}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  value={displayName}
                />
                <SecondaryButton
                  disabled
                  onClick={handleDisplayNameSave}
                  type="button"
                >
                  Save
                </SecondaryButton>
              </div>
            </Card>
          </section>

          <Card>
            <div className="members-header">
              <SectionLabel>Participants</SectionLabel>
              <span>{activeMembers.length} active</span>
            </div>
            <div className="members-list">
              {order.members.map((member) => (
                <MemberRow
                  canRemove={false}
                  isViewer={member.memberId === order.viewer.memberId}
                  key={member.memberId}
                  member={member}
                  onRemove={handleRemoveMember}
                />
              ))}
            </div>
          </Card>
        </>
      )}

      {error ? <p className="form-error">{error}</p> : null}

      {order.status === "open" ? (
        <section className="voting-action-shell">
          {isHost ? (
            <PrimaryButton className="voting-lock-button" disabled={isPending} onClick={handleLock} type="button">
              <span className="voting-lock-button-icon">
                <LockIcon />
              </span>
              <span>{isPending ? "Locking..." : "Lock group choice"}</span>
            </PrimaryButton>
          ) : (
            <Card className="action-card order-state-card">
              <div className="action-heading">
                <CopyIcon />
                <div>
                  <h2>Need to step out?</h2>
                  <p>You can leave the lobby while it is still open.</p>
                </div>
              </div>
              <SecondaryButton disabled={isPending} onClick={handleLeave} type="button">
                {isPending ? "Leaving..." : "Leave group"}
              </SecondaryButton>
            </Card>
          )}
        </section>
      ) : null}

      {order.status === "locked" ? (
        <Card className="action-card order-state-card locked-state-card">
          {isHost ? (
            <>
              <div className="action-heading">
                <LockIcon />
                <div>
                  <h2>Finalize the paid total</h2>
                  <p>Open the settlement sheet, enter the receipt total, and publish the final split.</p>
                </div>
              </div>
              <PrimaryButton onClick={() => setIsSettlementSheetDismissed(false)} type="button">
                Open finalize sheet
              </PrimaryButton>
            </>
          ) : (
            <>
              <div className="action-heading">
                <CopyIcon />
                <div>
                  <h2>Waiting on the host</h2>
                  <p>The lobby is locked. Results will appear here as soon as the host enters the final total.</p>
                </div>
              </div>
              <p className="settlement-waiting">You can stay on this screen while the final split is prepared.</p>
            </>
          )}
        </Card>
      ) : null}

      {order.status === "settled" ? (
        <>
          <div className="summary-grid settlement-summary-grid">
            <Card className="summary-card summary-card-emphasis">
              <SectionLabel>Total</SectionLabel>
              <h2>{formatMoney(order.totalAmountMinor, order.currencyCode)}</h2>
            </Card>
            <Card className="summary-card">
              <SectionLabel>Your share</SectionLabel>
              <h2>{formatMoney(viewerMember?.amountMinor ?? null, order.currencyCode)}</h2>
            </Card>
            <Card className="summary-card">
              <SectionLabel>{isHost ? "Guests owe you" : "Owe host"}</SectionLabel>
              <h2>{formatMoney(viewerMember?.owedToHostMinor ?? null, order.currencyCode)}</h2>
            </Card>
          </div>
          <div className="split-meter settlement-meter">
            <span style={{ width: "100%" }} />
          </div>
          <Card className="settlement-results-card">
            <div className="members-header">
              <SectionLabel>Settlement</SectionLabel>
              <span>
                Host: {order.hostName} • {settledMembers.length} active
              </span>
            </div>
            <div className="settlement-list">
              {settledMembers.map((member) => (
                <div className="settlement-item settlement-item-detailed" key={member.memberId}>
                  <div>
                    <div className="settlement-item-heading">
                      <strong>{member.displayName}</strong>
                      {member.role === "host" ? <StatusBadge tone="success">Host</StatusBadge> : null}
                    </div>
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

      {order.status === "locked" && isHost && isSettlementSheetOpen ? (
        <div className="settlement-sheet-backdrop" role="presentation">
          <div
            aria-labelledby="finalize-sheet-title"
            aria-modal="true"
            className="settlement-sheet"
            role="dialog"
          >
            <div className="settlement-sheet-header">
              <h2 id="finalize-sheet-title">Finalize & lock order</h2>
              <p>Enter the total spent amount to calculate the split among the active group members.</p>
            </div>
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
                className="splitit-input splitit-input-large settlement-amount-input"
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
                {amountPreviewMinor == null ? "Pending" : formatMoney(amountPreviewMinor, currencyCode)}
              </strong>
            </div>
            <div className="split-meter">
              <span style={{ width: amountPreviewMinor == null ? "64%" : "78%" }} />
            </div>
            <div className="settlement-sheet-actions">
              <PrimaryButton
                disabled={!amount.trim() || amountPreviewMinor == null || isPending}
                onClick={handleSettle}
                type="button"
              >
                {isPending ? "Calculating..." : "Calculate split & lock"}
              </PrimaryButton>
              <SecondaryButton onClick={() => setIsSettlementSheetDismissed(true)} type="button">
                Cancel
              </SecondaryButton>
            </div>
          </div>
        </div>
      ) : null}

      <div className="order-footer-links">
        <Link href="/">Back to dashboard</Link>
      </div>
    </SplitItShell>
  );
}
