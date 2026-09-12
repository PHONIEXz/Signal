import type { Metadata } from "next";
import PasswordRecovery from "@/components/PasswordRecovery";

export const metadata: Metadata = {
  title: "Choose a new password | Signal",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function ResetPasswordPage() {
  return <PasswordRecovery mode="reset" />;
}
