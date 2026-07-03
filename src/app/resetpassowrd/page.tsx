import { redirect } from "next/navigation";

export default async function ResetPasswordTypoRedirect({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = params.token?.trim();
  redirect(token ? `/resetpassword?token=${encodeURIComponent(token)}` : "/resetpassword");
}
