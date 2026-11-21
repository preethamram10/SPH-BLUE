import { redirect } from "next/navigation";

export default function TelecallerCallLogsRedirect() {
  redirect("/telecaller/dashboard?tab=log_call");
}
