import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) {
    redirect("/admin/login");
  }
  return session;
}
