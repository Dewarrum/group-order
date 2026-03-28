import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const orderStatus = v.union(
  v.literal("open"),
  v.literal("locked"),
  v.literal("settled"),
);

const memberRole = v.union(v.literal("host"), v.literal("participant"));
const memberStatus = v.union(
  v.literal("active"),
  v.literal("left"),
  v.literal("removed"),
);

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    email: v.union(v.string(), v.null()),
    imageUrl: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
  }).index("by_tokenIdentifier", ["tokenIdentifier"]),

  orders: defineTable({
    title: v.string(),
    hostUserId: v.id("users"),
    inviteCode: v.string(),
    status: orderStatus,
    currencyCode: v.union(v.string(), v.null()),
    totalAmountMinor: v.union(v.number(), v.null()),
    lockedAt: v.union(v.number(), v.null()),
    settledAt: v.union(v.number(), v.null()),
  })
    .index("by_inviteCode", ["inviteCode"])
    .index("by_hostUserId", ["hostUserId"]),

  orderMembers: defineTable({
    orderId: v.id("orders"),
    userId: v.id("users"),
    role: memberRole,
    displayName: v.string(),
    status: memberStatus,
    joinedAt: v.number(),
    inactiveAt: v.union(v.number(), v.null()),
  })
    .index("by_orderId_and_userId", ["orderId", "userId"])
    .index("by_orderId_and_joinedAt", ["orderId", "joinedAt"])
    .index("by_orderId_and_role", ["orderId", "role"])
    .index("by_userId_and_joinedAt", ["userId", "joinedAt"]),

  preferenceItems: defineTable({
    orderId: v.id("orders"),
    memberId: v.id("orderMembers"),
    text: v.string(),
    createdAt: v.number(),
  })
    .index("by_orderId_and_createdAt", ["orderId", "createdAt"])
    .index("by_memberId_and_createdAt", ["memberId", "createdAt"]),

  settlementShares: defineTable({
    orderId: v.id("orders"),
    memberId: v.id("orderMembers"),
    amountMinor: v.number(),
    owedToHostMinor: v.number(),
  }).index("by_orderId_and_memberId", ["orderId", "memberId"]),
});
