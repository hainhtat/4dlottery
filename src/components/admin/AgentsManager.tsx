"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@mui/joy/Button";
import Typography from "@mui/joy/Typography";
import Table from "@mui/joy/Table";
import FormControl from "@mui/joy/FormControl";
import FormLabel from "@mui/joy/FormLabel";
import Input from "@mui/joy/Input";
import Stack from "@mui/joy/Stack";
import Switch from "@mui/joy/Switch";
import { toast } from "react-toastify";
import { csrfHeaders } from "@/lib/api/csrf";
import type { Profile } from "@/lib/types/database";
import { useAsyncData } from "@/lib/hooks/use-async-data";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataCard } from "@/components/ui/DataCard";
import { PremiumModalDialog } from "@/components/ui/PremiumModalDialog";
import { useT } from "@/components/providers/LocaleProvider";

type AgentProfile = Profile & { email: string };

const emptyCreateForm = {
  email: "",
  password: "",
  displayName: "",
  phone: "",
  commissionRate: "5",
};

export function AgentsManager() {
  const t = useT();

  const fetchAgents = useCallback(async () => {
    const res = await fetch("/api/admin/agents");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || "Failed to load agents");
    return json.profiles as AgentProfile[];
  }, []);

  const { data: profiles, loading, refetch: refetchAgents } = useAsyncData(fetchAgents);

  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentProfile | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [editForm, setEditForm] = useState({
    displayName: "",
    phone: "",
    commissionRate: "5",
    isActive: true,
    newPassword: "",
  });

  useEffect(() => {
    if (!editAgent) return;
    setEditForm({
      displayName: editAgent.display_name,
      phone: editAgent.phone ?? "",
      commissionRate: String(editAgent.commission_rate),
      isActive: editAgent.is_active,
      newPassword: "",
    });
  }, [editAgent]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/admin/agents", {
      method: "POST",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        email: createForm.email,
        password: createForm.password,
        displayName: createForm.displayName,
        phone: createForm.phone,
        commissionRate: parseFloat(createForm.commissionRate),
      }),
    });
    const json = await res.json();
    setSubmitting(false);

    if (!res.ok) {
      toast.error(json.error || "Failed");
      return;
    }
    toast.success(t("admin.agents.created"));
    setCreateOpen(false);
    setCreateForm(emptyCreateForm);
    refetchAgents();
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editAgent) return;

    setSubmitting(true);

    const res = await fetch(`/api/admin/agents/${editAgent.id}`, {
      method: "PATCH",
      headers: csrfHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({
        displayName: editForm.displayName,
        phone: editForm.phone,
        commissionRate: parseFloat(editForm.commissionRate),
        isActive: editForm.isActive,
      }),
    });
    const json = await res.json();

    if (!res.ok) {
      setSubmitting(false);
      toast.error(json.error || "Failed");
      return;
    }

    if (editForm.newPassword.length > 0) {
      const pwRes = await fetch(`/api/admin/agents/${editAgent.id}/reset-password`, {
        method: "POST",
        headers: csrfHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ password: editForm.newPassword }),
      });
      const pwJson = await pwRes.json();
      if (!pwRes.ok) {
        setSubmitting(false);
        toast.error(pwJson.error || "Failed to reset password");
        refetchAgents();
        return;
      }
      toast.success(t("admin.agents.passwordReset"));
    } else {
      toast.success(t("admin.agents.updated"));
    }

    setSubmitting(false);
    setEditAgent(null);
    refetchAgents();
  }

  const list = profiles ?? [];

  return (
    <>
      <PageHeader
        title={t("admin.agents.title")}
        description={t("admin.agents.description")}
        action={<Button onClick={() => setCreateOpen(true)}>{t("admin.agents.addAgent")}</Button>}
      />

      <DataCard loading={loading} empty={!loading && list.length === 0} emptyMessage={t("admin.agents.empty")}>
        <Table hoverRow stickyHeader sx={{ "& thead th": { bgcolor: "background.level1", fontWeight: 600 } }}>
          <thead>
            <tr>
              <th>{t("admin.agents.col.name")}</th>
              <th>{t("admin.agents.col.email")}</th>
              <th>{t("admin.agents.col.phone")}</th>
              <th>{t("admin.agents.col.commission")}</th>
              <th>{t("admin.agents.col.active")}</th>
              <th>{t("admin.agents.col.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td>{p.display_name}</td>
                <td>{p.email || "—"}</td>
                <td>{p.phone ?? "—"}</td>
                <td>{p.commission_rate}%</td>
                <td>
                  <Typography level="body-sm" color={p.is_active ? "success" : "danger"}>
                    {p.is_active ? t("admin.agents.statusActive") : t("admin.agents.statusInactive")}
                  </Typography>
                </td>
                <td>
                  <Button size="sm" variant="soft" onClick={() => setEditAgent(p)}>
                    {t("admin.agents.edit")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </DataCard>

      <PremiumModalDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title={t("admin.agents.create")}
        subtitle={t("admin.agents.createSubtitle")}
      >
        <form onSubmit={handleCreate}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t("admin.agents.email")}</FormLabel>
              <Input
                required
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.password")}</FormLabel>
              <Input
                required
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.displayName")}</FormLabel>
              <Input
                required
                value={createForm.displayName}
                onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.phone")}</FormLabel>
              <Input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.commission")}</FormLabel>
              <Input
                type="number"
                value={createForm.commissionRate}
                onChange={(e) => setCreateForm({ ...createForm, commissionRate: e.target.value })}
              />
            </FormControl>
            <Button type="submit" loading={submitting}>
              {t("admin.agents.create")}
            </Button>
          </Stack>
        </form>
      </PremiumModalDialog>

      <PremiumModalDialog
        open={editAgent !== null}
        onClose={() => setEditAgent(null)}
        title={t("admin.agents.edit")}
        subtitle={editAgent?.email}
      >
        <form onSubmit={handleEdit}>
          <Stack spacing={2}>
            <FormControl>
              <FormLabel>{t("admin.agents.displayName")}</FormLabel>
              <Input
                required
                value={editForm.displayName}
                onChange={(e) => setEditForm({ ...editForm, displayName: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.phone")}</FormLabel>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.commission")}</FormLabel>
              <Input
                type="number"
                value={editForm.commissionRate}
                onChange={(e) => setEditForm({ ...editForm, commissionRate: e.target.value })}
              />
            </FormControl>
            <FormControl orientation="horizontal" sx={{ justifyContent: "space-between" }}>
              <div>
                <FormLabel>{t("admin.agents.isActive")}</FormLabel>
                <Typography level="body-sm" color="neutral">
                  {editForm.isActive
                    ? t("admin.agents.statusActive")
                    : t("admin.agents.statusInactive")}
                </Typography>
              </div>
              <Switch
                checked={editForm.isActive}
                onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
              />
            </FormControl>
            <FormControl>
              <FormLabel>{t("admin.agents.newPassword")}</FormLabel>
              <Input
                type="password"
                placeholder={t("admin.agents.newPasswordHint")}
                value={editForm.newPassword}
                onChange={(e) => setEditForm({ ...editForm, newPassword: e.target.value })}
              />
            </FormControl>
            <Stack direction="row" spacing={1}>
              <Button type="submit" loading={submitting}>
                {t("admin.agents.save")}
              </Button>
              <Button type="button" variant="plain" color="neutral" onClick={() => setEditAgent(null)}>
                {t("common.cancel")}
              </Button>
            </Stack>
          </Stack>
        </form>
      </PremiumModalDialog>
    </>
  );
}
