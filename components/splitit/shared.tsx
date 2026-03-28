"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export function SplitItShell({
  children,
  footer,
  subtitle,
  title,
}: {
  children: ReactNode;
  footer?: ReactNode;
  subtitle?: string;
  title?: ReactNode;
}) {
  return (
    <main className="splitit-app min-h-full">
      <div className="splitit-frame">
        <header className="splitit-topbar">
          <div className="splitit-brand">
            <div className="splitit-brand-mark">S</div>
            <div>
              <p className="splitit-wordmark">SplitIt</p>
              {subtitle ? <p className="splitit-subtitle">{subtitle}</p> : null}
            </div>
          </div>
          <div className="splitit-topbar-actions">
            {title ? <div className="splitit-topbar-title">{title}</div> : null}
            <UserButton />
          </div>
        </header>
        <div className="splitit-page">{children}</div>
        {footer ? <div className="splitit-footer">{footer}</div> : null}
      </div>
    </main>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="section-label">{children}</p>;
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button-primary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button-secondary ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function QuietButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className={`button-quiet ${className}`.trim()} {...props}>
      {children}
    </button>
  );
}

export function StatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "success" | "warning";
}) {
  return <span className={`status-badge ${tone}`}>{children}</span>;
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <section className={`splitit-card ${className}`.trim()}>{children}</section>;
}

export function EmptyState({
  action,
  body,
  title,
}: {
  action?: ReactNode;
  body: string;
  title: string;
}) {
  return (
    <Card className="empty-card">
      <p className="section-label">Nothing here yet</p>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </Card>
  );
}

export function BottomNav({
  items,
}: {
  items: Array<{
    active?: boolean;
    href?: string;
    label: string;
  }>;
}) {
  return (
    <nav className="bottom-nav" aria-label="Primary">
      {items.map((item) =>
        item.href ? (
          <Link key={item.label} className={`bottom-nav-link ${item.active ? "active" : ""}`} href={item.href}>
            {item.label}
          </Link>
        ) : (
          <span key={item.label} className={`bottom-nav-link ${item.active ? "active" : ""}`}>
            {item.label}
          </span>
        ),
      )}
    </nav>
  );
}

export function CopyIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M9 9.75A2.25 2.25 0 0 1 11.25 7.5h6A2.25 2.25 0 0 1 19.5 9.75v6A2.25 2.25 0 0 1 17.25 18h-6A2.25 2.25 0 0 1 9 15.75z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M5.25 15.75V6.75A2.25 2.25 0 0 1 7.5 4.5h9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ShareIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M15.75 8.25 8.25 12l7.5 3.75M18 6a2.25 2.25 0 1 1 0-4.5A2.25 2.25 0 0 1 18 6ZM6 14.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Zm12 8.25a2.25 2.25 0 1 1 0-4.5 2.25 2.25 0 0 1 0 4.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function LockIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path
        d="M7.5 10.5V8.25a4.5 4.5 0 1 1 9 0v2.25M6.75 10.5h10.5A2.25 2.25 0 0 1 19.5 12.75v6A2.25 2.25 0 0 1 17.25 21H6.75A2.25 2.25 0 0 1 4.5 18.75v-6a2.25 2.25 0 0 1 2.25-2.25Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}
