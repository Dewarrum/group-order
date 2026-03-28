"use client";

import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { AuthLoading, Authenticated, Unauthenticated, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function ViewerCard() {
  const viewer = useQuery(api.auth.viewer, {});

  if (!viewer) {
    return (
      <div className="rounded-3xl border border-black/10 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
        Syncing your Clerk session with Convex...
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-emerald-200 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(16,185,129,0.55)] backdrop-blur">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-emerald-700">
            Convex Authenticated
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">
            {viewer.name ?? viewer.email ?? "Signed in"}
          </h2>
        </div>
        <UserButton />
      </div>
      <dl className="mt-6 grid gap-4 text-sm text-slate-700 sm:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="font-medium text-slate-500">Email</dt>
          <dd className="mt-1 break-all">{viewer.email ?? "Not available"}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4">
          <dt className="font-medium text-slate-500">Issuer</dt>
          <dd className="mt-1 break-all">{viewer.issuer}</dd>
        </div>
        <div className="rounded-2xl bg-slate-50 p-4 sm:col-span-2">
          <dt className="font-medium text-slate-500">Token Identifier</dt>
          <dd className="mt-1 break-all">{viewer.tokenIdentifier}</dd>
        </div>
      </dl>
    </div>
  );
}

export function AuthHome() {
  return (
    <main className="flex min-h-full flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_35%),linear-gradient(160deg,#f8fafc_0%,#eef2ff_45%,#ecfeff_100%)] px-6 py-16 text-slate-950">
      <div className="w-full max-w-5xl rounded-[2rem] border border-white/70 bg-white/55 p-6 shadow-[0_30px_120px_-70px_rgba(15,23,42,0.6)] backdrop-blur-xl sm:p-10">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-700">
              Next.js + Clerk + Convex
            </p>
            <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-6xl">
              Authentication is now wired end to end.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              Sign in with Clerk, let Convex validate the JWT, and confirm the
              active identity from a protected backend query.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-medium text-white transition hover:bg-slate-800"
              >
                Create account
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-medium text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </section>

          <section>
            <AuthLoading>
              <div className="rounded-3xl border border-black/10 bg-white/80 p-6 text-sm text-slate-600 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.4)]">
                Waiting for Clerk and Convex to finish the auth handshake...
              </div>
            </AuthLoading>

            <Unauthenticated>
              <div className="rounded-3xl border border-amber-200 bg-white/90 p-6 shadow-[0_24px_80px_-48px_rgba(245,158,11,0.55)]">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-amber-700">
                  Signed out
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  Your public landing page is live.
                </h2>
                <p className="mt-4 text-sm leading-7 text-slate-600">
                  Use the sign-in or sign-up routes to start a Clerk session.
                  Once you are authenticated, this panel will switch to a
                  Convex-backed identity view.
                </p>
              </div>
            </Unauthenticated>

            <Authenticated>
              <ViewerCard />
            </Authenticated>
          </section>
        </div>
      </div>
    </main>
  );
}
