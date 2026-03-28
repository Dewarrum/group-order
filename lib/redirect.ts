import { redirect } from "next/navigation";

export function redirectToSignIn(returnBackUrl: string) {
  redirect(`/sign-in?redirect_url=${encodeURIComponent(returnBackUrl)}`);
}
