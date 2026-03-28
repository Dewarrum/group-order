import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="auth-stage">
      <div className="auth-stage-copy">
        <p className="section-label">SplitIt access</p>
        <h1>Create an account for group ordering.</h1>
        <p>
          Use one account to host sessions, re-open settled history, and jump back into any invite you receive.
        </p>
      </div>
      <div className="auth-stage-panel">
        <SignUp path="/sign-up" signInUrl="/sign-in" />
      </div>
    </main>
  );
}
