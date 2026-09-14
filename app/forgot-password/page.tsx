import type { Metadata } from "next";
import PasswordRecovery from "@/components/PasswordRecovery";

export const metadata: Metadata = {
  title: "Reset your password | Signal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ForgotPasswordPage() {
  return <PasswordRecovery mode="request" />;
}
