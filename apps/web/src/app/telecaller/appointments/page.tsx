import { redirect } from "next/navigation";

export default function TelecallerAppointmentsPage() {
  redirect("/telecaller/dashboard?tab=book_appointment");
}
