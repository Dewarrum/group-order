import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const MAX_MEMBERS = 100;
const MAX_PREFERENCES = 300;
const DASHBOARD_LIMIT = 40;

const orderIdValidator = v.id("orders");
const memberIdValidator = v.id("orderMembers");
const preferenceIdValidator = v.id("preferenceItems");

function normalizeTitle(value: string) {
  const title = value.trim();
  if (title.length < 3 || title.length > 80) {
    throw new Error("Order title must be between 3 and 80 characters.");
  }
  return title;
}

function normalizeDisplayName(value: string) {
  const displayName = value.trim();
  if (displayName.length < 2 || displayName.length > 40) {
    throw new Error("Display name must be between 2 and 40 characters.");
  }
  return displayName;
}

function normalizePreferenceText(value: string) {
  const text = value.trim();
  if (text.length < 1 || text.length > 120) {
    throw new Error("Preference text must be between 1 and 120 characters.");
  }
  return text;
}

function assertSupportedCurrencyCode(currencyCode: string) {
  if (!/^[A-Z]{3}$/.test(currencyCode)) {
    throw new Error("Currency code must be a 3-letter ISO code.");
  }

  try {
    new Intl.NumberFormat("en", {
      style: "currency",
      currency: currencyCode,
    }).format(0);
  } catch {
    throw new Error("Unsupported currency code.");
  }
}

function defaultDisplayName(identity: {
  email?: string | null;
  name?: string | null;
}) {
  if (identity.name?.trim()) {
    return identity.name.trim();
  }
  if (identity.email?.trim()) {
    return identity.email.split("@")[0] ?? "Guest";
  }
  return "Guest";
}

async function requireIdentity(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
}

async function getUserByTokenIdentifier(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string,
) {
  return await ctx.db
    .query("users")
    .withIndex("by_tokenIdentifier", (q) => q.eq("tokenIdentifier", tokenIdentifier))
    .unique();
}

async function requireViewerUser(ctx: QueryCtx | MutationCtx) {
  const identity = await requireIdentity(ctx);
  const user = await getUserByTokenIdentifier(ctx, identity.tokenIdentifier);

  return { identity, user };
}

async function ensureViewerUser(ctx: MutationCtx) {
  const identity = await requireIdentity(ctx);
  const existing = await getUserByTokenIdentifier(ctx, identity.tokenIdentifier);
  const nextProfile = {
    email: identity.email ?? null,
    imageUrl: typeof identity.imageUrl === "string" ? identity.imageUrl : null,
    name: identity.name ?? null,
  };

  if (existing) {
    if (
      existing.email !== nextProfile.email ||
      existing.imageUrl !== nextProfile.imageUrl ||
      existing.name !== nextProfile.name
    ) {
      await ctx.db.patch(existing._id, nextProfile);
    }
    return { identity, user: { ...existing, ...nextProfile } };
  }

  const userId = await ctx.db.insert("users", {
    tokenIdentifier: identity.tokenIdentifier,
    ...nextProfile,
  });

  return {
    identity,
    user: {
      _id: userId,
      _creationTime: Date.now(),
      tokenIdentifier: identity.tokenIdentifier,
      ...nextProfile,
    } satisfies Doc<"users">,
  };
}

async function getOrderByInviteCode(ctx: QueryCtx | MutationCtx, inviteCode: string) {
  return await ctx.db
    .query("orders")
    .withIndex("by_inviteCode", (q) => q.eq("inviteCode", inviteCode))
    .unique();
}

async function getMembershipByOrderAndUser(
  ctx: QueryCtx | MutationCtx,
  orderId: Id<"orders">,
  userId: Id<"users">,
) {
  return await ctx.db
    .query("orderMembers")
    .withIndex("by_orderId_and_userId", (q) => q.eq("orderId", orderId).eq("userId", userId))
    .unique();
}

async function getActiveMembers(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
  const members = await ctx.db
    .query("orderMembers")
    .withIndex("by_orderId_and_joinedAt", (q) => q.eq("orderId", orderId))
    .take(MAX_MEMBERS);

  return members.filter((member) => member.status === "active");
}

async function getHostMembership(ctx: QueryCtx | MutationCtx, orderId: Id<"orders">) {
  const host = await ctx.db
    .query("orderMembers")
    .withIndex("by_orderId_and_role", (q) => q.eq("orderId", orderId).eq("role", "host"))
    .unique();

  return host;
}

function orderPreviewShape(args: {
  activeMemberCount: number;
  isHost: boolean;
  order: Doc<"orders">;
  viewerShareMinor: number | null;
}) {
  const { activeMemberCount, isHost, order, viewerShareMinor } = args;
  return {
    activeMemberCount,
    currencyCode: order.currencyCode,
    inviteCode: order.inviteCode,
    isHost,
    orderId: order._id,
    settledAt: order.settledAt,
    status: order.status,
    title: order.title,
    totalAmountMinor: order.totalAmountMinor,
    viewerShareMinor,
  };
}

export const dashboard = query({
  args: {},
  handler: async (ctx) => {
    const { identity, user } = await requireViewerUser(ctx);
    const viewerName = defaultDisplayName(identity);

    if (!user) {
      return {
        activeOrders: [],
        recentOrders: [],
        viewerName,
      };
    }

    const memberships = await ctx.db
      .query("orderMembers")
      .withIndex("by_userId_and_joinedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(DASHBOARD_LIMIT);

    const seenOrderIds = new Set<Id<"orders">>();
    const activeOrders: Array<ReturnType<typeof orderPreviewShape>> = [];
    const recentOrders: Array<ReturnType<typeof orderPreviewShape>> = [];

    for (const membership of memberships) {
      if (seenOrderIds.has(membership.orderId)) {
        continue;
      }
      seenOrderIds.add(membership.orderId);

      const order = await ctx.db.get(membership.orderId);
      if (!order) {
        continue;
      }

      const members = await getActiveMembers(ctx, order._id);
      const settlementShares = await ctx.db
        .query("settlementShares")
        .withIndex("by_orderId_and_memberId", (q) => q.eq("orderId", order._id))
        .take(MAX_MEMBERS);
      const viewerShare =
        settlementShares.find((share) => share.memberId === membership._id)?.amountMinor ?? null;

      const preview = orderPreviewShape({
        activeMemberCount: members.length,
        isHost: membership.role === "host",
        order,
        viewerShareMinor: viewerShare,
      });

      if (order.status === "settled") {
        recentOrders.push(preview);
      } else if (membership.status === "active") {
        activeOrders.push(preview);
      }
    }

    return { activeOrders, recentOrders, viewerName };
  },
});

export const invitePreview = query({
  args: {
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await requireViewerUser(ctx);
    const order = await getOrderByInviteCode(ctx, args.inviteCode.trim());

    if (!order) {
      return null;
    }

    const host = await getHostMembership(ctx, order._id);
    const activeMemberCount = (await getActiveMembers(ctx, order._id)).length;
    const membership = user
      ? await getMembershipByOrderAndUser(ctx, order._id, user._id)
      : null;

    return {
      activeMemberCount,
      currentDisplayName: membership?.displayName ?? defaultDisplayName(identity),
      hostName: host?.displayName ?? "Host",
      membershipStatus: membership?.status ?? null,
      orderId: order._id,
      status: order.status,
      title: order.title,
    };
  },
});

export const orderDetail = query({
  args: {
    orderId: orderIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await requireViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);

    if (!order || !user) {
      return null;
    }

    const viewerMembership = await getMembershipByOrderAndUser(ctx, order._id, user._id);
    if (!viewerMembership) {
      return null;
    }

    const hostMembership = await getHostMembership(ctx, order._id);
    const members = await ctx.db
      .query("orderMembers")
      .withIndex("by_orderId_and_joinedAt", (q) => q.eq("orderId", order._id))
      .take(MAX_MEMBERS);
    const preferences = await ctx.db
      .query("preferenceItems")
      .withIndex("by_orderId_and_createdAt", (q) => q.eq("orderId", order._id))
      .take(MAX_PREFERENCES);
    const settlementShares = await ctx.db
      .query("settlementShares")
      .withIndex("by_orderId_and_memberId", (q) => q.eq("orderId", order._id))
      .take(MAX_MEMBERS);

    const preferenceMap = new Map<Id<"orderMembers">, Array<Doc<"preferenceItems">>>();
    for (const preference of preferences) {
      const current = preferenceMap.get(preference.memberId) ?? [];
      current.push(preference);
      preferenceMap.set(preference.memberId, current);
    }

    const settlementMap = new Map<Id<"orderMembers">, Doc<"settlementShares">>();
    for (const share of settlementShares) {
      settlementMap.set(share.memberId, share);
    }

    return {
      currencyCode: order.currencyCode,
      hostName: hostMembership?.displayName ?? "Host",
      inviteCode: order.inviteCode,
      lockedAt: order.lockedAt,
      members: members.map((member) => ({
        amountMinor: settlementMap.get(member._id)?.amountMinor ?? null,
        displayName: member.displayName,
        inactiveAt: member.inactiveAt,
        memberId: member._id,
        owedToHostMinor: settlementMap.get(member._id)?.owedToHostMinor ?? null,
        preferences: preferenceMap.get(member._id) ?? [],
        role: member.role,
        status: member.status,
        userId: member.userId,
      })),
      orderId: order._id,
      settledAt: order.settledAt,
      status: order.status,
      title: order.title,
      totalAmountMinor: order.totalAmountMinor,
      viewer: {
        displayName: viewerMembership.displayName,
        memberId: viewerMembership._id,
        role: viewerMembership.role,
        status: viewerMembership.status,
      },
    };
  },
});

export const createOrder = mutation({
  args: {
    inviteCode: v.string(),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const { identity, user } = await ensureViewerUser(ctx);
    const inviteCode = args.inviteCode.trim().toUpperCase();

    if (!/^[A-Z0-9]{6,10}$/.test(inviteCode)) {
      throw new Error("Invite code must be 6-10 uppercase letters or numbers.");
    }

    const existing = await getOrderByInviteCode(ctx, inviteCode);
    if (existing) {
      throw new Error("Invite code already exists.");
    }

    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      currencyCode: null,
      hostUserId: user._id,
      inviteCode,
      lockedAt: null,
      settledAt: null,
      status: "open",
      title: normalizeTitle(args.title),
      totalAmountMinor: null,
    });

    await ctx.db.insert("orderMembers", {
      displayName: defaultDisplayName(identity),
      inactiveAt: null,
      joinedAt: now,
      orderId,
      role: "host",
      status: "active",
      userId: user._id,
    });

    return { inviteCode, orderId };
  },
});

export const joinOrder = mutation({
  args: {
    displayName: v.string(),
    inviteCode: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await getOrderByInviteCode(ctx, args.inviteCode.trim());

    if (!order) {
      throw new Error("Order not found.");
    }
    if (order.status !== "open") {
      throw new Error("This order is no longer accepting new participants.");
    }

    const existingMembership = await getMembershipByOrderAndUser(ctx, order._id, user._id);
    if (existingMembership) {
      if (existingMembership.status === "removed") {
        throw new Error("You were removed from this order.");
      }
      if (existingMembership.status === "active") {
        return { alreadyJoined: true, orderId: order._id };
      }
      await ctx.db.patch(existingMembership._id, {
        displayName: normalizeDisplayName(args.displayName),
        inactiveAt: null,
        status: "active",
      });
      return { alreadyJoined: false, orderId: order._id };
    }

    await ctx.db.insert("orderMembers", {
      displayName: normalizeDisplayName(args.displayName),
      inactiveAt: null,
      joinedAt: Date.now(),
      orderId: order._id,
      role: "participant",
      status: "active",
      userId: user._id,
    });

    return { alreadyJoined: false, orderId: order._id };
  },
});

export const updateDisplayName = mutation({
  args: {
    displayName: v.string(),
    orderId: orderIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("This order can no longer be edited.");
    }

    const membership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!membership || membership.status !== "active") {
      throw new Error("You are not an active member of this order.");
    }

    await ctx.db.patch(membership._id, {
      displayName: normalizeDisplayName(args.displayName),
    });
  },
});

export const addPreferenceItem = mutation({
  args: {
    orderId: orderIdValidator,
    text: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("This order can no longer be edited.");
    }

    const membership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!membership || membership.status !== "active") {
      throw new Error("You are not an active member of this order.");
    }

    await ctx.db.insert("preferenceItems", {
      createdAt: Date.now(),
      memberId: membership._id,
      orderId: args.orderId,
      text: normalizePreferenceText(args.text),
    });
  },
});

export const removePreferenceItem = mutation({
  args: {
    orderId: orderIdValidator,
    preferenceItemId: preferenceIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("This order can no longer be edited.");
    }

    const membership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!membership || membership.status !== "active") {
      throw new Error("You are not an active member of this order.");
    }

    const preferenceItem = await ctx.db.get(args.preferenceItemId);
    if (!preferenceItem || preferenceItem.memberId !== membership._id) {
      throw new Error("Preference item not found.");
    }

    await ctx.db.delete(preferenceItem._id);
  },
});

export const leaveOrder = mutation({
  args: {
    orderId: orderIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("This order can no longer be edited.");
    }

    const membership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!membership || membership.status !== "active") {
      throw new Error("You are not an active member of this order.");
    }
    if (membership.role === "host") {
      throw new Error("The host cannot leave the order.");
    }

    await ctx.db.patch(membership._id, {
      inactiveAt: Date.now(),
      status: "left",
    });
  },
});

export const removeParticipant = mutation({
  args: {
    memberId: memberIdValidator,
    orderId: orderIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("This order can no longer be edited.");
    }

    const hostMembership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!hostMembership || hostMembership.role !== "host") {
      throw new Error("Only the host can remove participants.");
    }

    const member = await ctx.db.get(args.memberId);
    if (!member || member.orderId !== args.orderId) {
      throw new Error("Member not found.");
    }
    if (member.role === "host") {
      throw new Error("The host cannot be removed.");
    }

    await ctx.db.patch(member._id, {
      inactiveAt: Date.now(),
      status: "removed",
    });
  },
});

export const lockOrder = mutation({
  args: {
    orderId: orderIdValidator,
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "open") {
      throw new Error("Only open orders can be locked.");
    }

    const hostMembership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!hostMembership || hostMembership.role !== "host") {
      throw new Error("Only the host can lock this order.");
    }

    const activeMembers = await getActiveMembers(ctx, args.orderId);
    if (activeMembers.length === 0) {
      throw new Error("At least one active member is required.");
    }

    await ctx.db.patch(args.orderId, {
      lockedAt: Date.now(),
      status: "locked",
    });
  },
});

export const settleOrder = mutation({
  args: {
    currencyCode: v.string(),
    orderId: orderIdValidator,
    totalAmountMinor: v.number(),
  },
  handler: async (ctx, args) => {
    const { user } = await ensureViewerUser(ctx);
    const order = await ctx.db.get(args.orderId);
    if (!order || order.status !== "locked") {
      throw new Error("Only locked orders can be settled.");
    }

    const hostMembership = await getMembershipByOrderAndUser(ctx, args.orderId, user._id);
    if (!hostMembership || hostMembership.role !== "host") {
      throw new Error("Only the host can settle this order.");
    }

    assertSupportedCurrencyCode(args.currencyCode);
    if (!Number.isInteger(args.totalAmountMinor) || args.totalAmountMinor < 0) {
      throw new Error("Total amount must be a non-negative integer in minor units.");
    }

    const existingShares = await ctx.db
      .query("settlementShares")
      .withIndex("by_orderId_and_memberId", (q) => q.eq("orderId", args.orderId))
      .take(1);
    if (existingShares.length > 0) {
      throw new Error("This order has already been settled.");
    }

    const activeMembers = await getActiveMembers(ctx, args.orderId);
    if (activeMembers.length === 0) {
      throw new Error("At least one active member is required.");
    }

    const orderedMembers = [...activeMembers].sort((left, right) => {
      if (left.joinedAt !== right.joinedAt) {
        return left.joinedAt - right.joinedAt;
      }
      return left._id.localeCompare(right._id);
    });
    const baseShare = Math.floor(args.totalAmountMinor / orderedMembers.length);
    const remainder = args.totalAmountMinor % orderedMembers.length;

    for (const [index, member] of orderedMembers.entries()) {
      const amountMinor = baseShare + (index < remainder ? 1 : 0);
      await ctx.db.insert("settlementShares", {
        amountMinor,
        memberId: member._id,
        orderId: args.orderId,
        owedToHostMinor: member.role === "host" ? 0 : amountMinor,
      });
    }

    await ctx.db.patch(args.orderId, {
      currencyCode: args.currencyCode,
      settledAt: Date.now(),
      status: "settled",
      totalAmountMinor: args.totalAmountMinor,
    });
  },
});
