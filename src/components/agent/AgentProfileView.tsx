"use client";

import { useEffect, useState } from "react";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Typography from "@mui/joy/Typography";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Button from "@mui/joy/Button";
import Stack from "@mui/joy/Stack";
import Divider from "@mui/joy/Divider";
import { createClient } from "@/lib/supabase/client";
import { PageHeader } from "@/components/ui/PageHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { toast } from "react-toastify";
import { useT } from "@/components/providers/LocaleProvider";

export function AgentProfileView() {
  const t = useT();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [userId, setUserId] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [commissionRate, setCommissionRate] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled || !user) {
        setLoading(false);
        return;
      }
      setUserId(user.id);
      setEmail(user.email ?? "");
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("display_name, phone, commission_rate")
        .eq("id", user.id)
        .single();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
      } else if (profile) {
        setDisplayName(profile.display_name ?? "");
        setPhone(profile.phone ?? "");
        setCommissionRate(Number(profile.commission_rate));
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) return;
    setSavingProfile(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || "Agent",
        phone: phone.trim() || null,
      })
      .eq("id", userId);
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success(t("agent.profile.saved"));
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error(t("agent.profile.passwordMin"));
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error(t("agent.profile.passwordMismatch"));
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);
    if (error) toast.error(error.message);
    else {
      toast.success(t("agent.profile.passwordUpdated"));
      setNewPassword("");
      setConfirmPassword("");
    }
  }

  if (loading) {
    return (
      <>
        <PageHeader title={t("agent.profile.title")} description={t("common.loading")} />
        <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
          {t("agent.profile.loading")}
        </Typography>
      </>
    );
  }

  const seed = userId || email;

  return (
    <>
      <PageHeader title={t("agent.profile.title")} description={t("agent.profile.description")} />

      <Card variant="outlined" sx={{ p: 3, mb: 2, maxWidth: 480 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <UserAvatar seed={seed} size="lg" />
          <Box>
            <Typography level="title-md">{displayName || t("common.agent")}</Typography>
            <Typography level="body-sm" sx={{ color: "text.tertiary" }}>
              {email}
            </Typography>
            {commissionRate != null && (
              <Typography level="body-xs" sx={{ color: "text.tertiary", mt: 0.5 }}>
                {t("agent.profile.commissionRate", { rate: commissionRate })}
              </Typography>
            )}
          </Box>
        </Stack>
        <Typography level="body-xs" sx={{ color: "text.tertiary" }}>
          {t("agent.profile.avatarNote")}
        </Typography>
      </Card>

      <Card variant="outlined" sx={{ p: 3, mb: 2, maxWidth: 480 }}>
        <Typography level="title-md" sx={{ mb: 2 }}>
          {t("agent.profile.contact")}
        </Typography>
        <form onSubmit={(e) => void saveProfile(e)}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t("agent.profile.displayName")}</FormLabel>
              <Input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("agent.profile.phone")}</FormLabel>
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={t("agent.profile.phoneOptional")}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("agent.profile.email")}</FormLabel>
              <Input value={email} disabled />
            </FormControl>
            <Button type="submit" loading={savingProfile}>
              {t("agent.profile.save")}
            </Button>
          </Stack>
        </form>
      </Card>

      <Card variant="outlined" sx={{ p: 3, maxWidth: 480 }}>
        <Typography level="title-md" sx={{ mb: 0.5 }}>
          {t("agent.profile.changePassword")}
        </Typography>
        <Typography level="body-sm" sx={{ color: "text.tertiary", mb: 2 }}>
          {t("agent.profile.passwordHint")}
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <form onSubmit={(e) => void changePassword(e)}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t("agent.profile.newPassword")}</FormLabel>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("agent.profile.confirmPassword")}</FormLabel>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </FormControl>
            <Button type="submit" variant="soft" color="primary" loading={savingPassword}>
              {t("agent.profile.updatePassword")}
            </Button>
          </Stack>
        </form>
      </Card>
    </>
  );
}
