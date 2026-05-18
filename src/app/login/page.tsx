"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Alert from "@mui/joy/Alert";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigError } from "@/lib/supabase/env";
import { useT } from "@/components/providers/LocaleProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { toast } from "react-toastify";
import { csrfHeaders } from "@/lib/api/csrf";

function LoginPageClient() {
  const t = useT();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const loginReason = searchParams.get("reason");

  useEffect(() => {
    setConfigError(supabaseConfigError());
  }, []);

  useEffect(() => {
    if (loginReason === "no_role" || loginReason === "unauthorized") {
      toast.error(t("login.noRole"));
    }
  }, [loginReason, t]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ email, password }),
        credentials: "same-origin",
      });

      let json: { error?: string; role?: string | null } = {};
      try {
        json = (await res.json()) as typeof json;
      } catch {
        json = {};
      }

      if (!res.ok) {
        toast.error(json.error ?? t("login.networkError"));
        return;
      }

      const role = json.role;
      if (role === "admin") {
        router.replace("/admin/dashboard");
        router.refresh();
        return;
      }
      if (role === "agent") {
        router.replace("/agent/sell");
        router.refresh();
        return;
      }

      toast.error(t("login.noRole"));
      await supabase.auth.signOut();
    } catch {
      toast.error(t("login.networkError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(145deg, #0f172a 0%, #1e293b 45%, #0f172a 100%)",
        p: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{
          width: "100%",
          maxWidth: 420,
          p: { xs: 3, sm: 4 },
          boxShadow: "lg",
          borderColor: "primary.200",
        }}
      >
        <Stack spacing={0.5} sx={{ mb: 2, textAlign: "center" }}>
          <Typography
            level="body-xs"
            sx={{ color: "primary.600", letterSpacing: "0.2em", textTransform: "uppercase" }}
          >
            {t("app.brand")}
          </Typography>
          <Typography level="h3" sx={{ fontWeight: 700 }}>
            {t("login.welcome")}
          </Typography>
          <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
            {t("login.subtitle")}
          </Typography>
        </Stack>

        <Box sx={{ mb: 2 }}>
          <LanguageSwitcher />
        </Box>

        {configError && (
          <Alert color="warning" variant="soft" sx={{ mb: 2 }}>
            {t("login.configError", { message: configError })}
          </Alert>
        )}

        <form onSubmit={(e) => void handleSubmit(e)}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t("login.email")}</FormLabel>
              <Input
                type="email"
                required
                size="lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("login.password")}</FormLabel>
              <Input
                type="password"
                required
                size="lg"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </FormControl>
            <Button type="submit" loading={loading} size="lg" sx={{ mt: 1 }}>
              {t("login.submit")}
            </Button>
          </Stack>
        </form>
      </Card>
    </Box>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
