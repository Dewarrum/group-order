import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main className="auth-stage">
      <div className="auth-stage-copy">
        <p className="section-label">SplitIt access</p>
        <h1>Sign in to manage your group order.</h1>
        <p>
          Hosts create rooms, guests join through shared links, and everyone gets the same final split.
        </p>
      </div>
      <div className="auth-stage-panel">
        <SignIn path="/sign-in" signUpUrl="/sign-up" />
      </div>
    </main>
  );
}
