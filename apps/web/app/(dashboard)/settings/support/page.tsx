import { redirect } from "next/navigation";

export default function SettingsSupportPage() {
  redirect("/settings?tab=support");
}
