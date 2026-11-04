import { redirect } from "next/navigation";

export default function RedirectToEmployeeManagement() {
  redirect("/admin/employee-management");
}
