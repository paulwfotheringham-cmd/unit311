import { redirect } from "next/navigation";

export default function CommunicationsPage() {
  redirect("/internaldashboard?view=communications");
}
