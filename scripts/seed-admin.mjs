/**
 * Seed admin user: npm run seed:admin
 * Reads .env.local automatically (same as Next.js).
 */
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.SEED_ADMIN_EMAIL || "admin@lottery.local";
const password = process.env.SEED_ADMIN_PASSWORD || "Admin123!ChangeMe";

if (!url || !key) {
  console.error(
    "Missing env in .env.local:\n" +
      "  NEXT_PUBLIC_SUPABASE_URL\n" +
      "  SUPABASE_SERVICE_ROLE_KEY (service_role JWT — NOT the publishable key)"
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  app_metadata: { role: "admin" },
  user_metadata: { display_name: "System Admin" },
});

if (error) {
  if (error.message.includes("already been registered")) {
    const { data: list } = await supabase.auth.admin.listUsers();
    const existing = list?.users?.find((u) => u.email === email);
    if (existing) {
      await supabase.auth.admin.updateUserById(existing.id, {
        app_metadata: { role: "admin" },
      });
      console.log("Updated existing admin:", email);
      process.exit(0);
    }
  }
  console.error(error.message);
  process.exit(1);
}

await supabase
  .from("profiles")
  .update({ display_name: "System Admin" })
  .eq("id", data.user.id);

console.log("Admin created:", email);
