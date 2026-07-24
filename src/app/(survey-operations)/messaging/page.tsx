import { redirect } from "next/navigation";

export default function MessagingPage() {
  redirect("/internaldashboard?view=messaging");
}
