import { redirect } from "next/navigation";

/**
 * 運用パスは /line-setup。ダッシュボードからはここへリダイレクト。
 */
export default function DashboardLineSetupRedirect() {
  redirect("/line-setup");
}
