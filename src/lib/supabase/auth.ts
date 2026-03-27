import { redirect } from "next/navigation";
import { createClient } from "./server";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/admin/login");
  }
  return user;
}
