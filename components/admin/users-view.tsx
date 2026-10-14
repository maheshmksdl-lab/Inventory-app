"use client";

import { useMemo, useState } from "react";
import { CheckIcon, MinusIcon, PauseCircleIcon, PencilSimpleIcon, PlayCircleIcon, PlusIcon, ShieldCheckIcon, UserGearIcon, UsersThreeIcon } from "@phosphor-icons/react/dist/ssr";
import { toast } from "sonner";
import { z } from "zod";
import { DataTable, ListToolbar, matches, type Column } from "@/components/shared/data-table";
import { PrototypeNote, StatRow, StatTile } from "@/components/shared/doc-ui";
import { ChoiceField, FormDialog, TextField, useZodForm } from "@/components/shared/form-kit";
import { Card, FilterSelect, PageHeading, PageShell, PrimaryButton, SearchInput, td, th, ToneBadge, UnderlineTabs } from "@/components/shared/inventory-ui";
import { RowMenu } from "@/components/shared/row-menu";
import { EmptyState } from "@/components/shared/state-panels";
import { useRecords, useSaveRecord } from "@/hooks/use-operations";
import { formatDateTime, initials } from "@/lib/format";
import { ACCESS_LABEL, PERMISSION_AREAS, ROLES, roleLabel, USER_STATUS, type Access } from "@/lib/operations-meta";
import type { AppUser, RoleId } from "@/lib/types/operations";
import { cn } from "@/lib/utils";

const DEMO_NOTE = "UI demonstration only — no account is created, no invitation is sent and permissions are not enforced.";
const TEAMS = ["Operations", "Inventory Control", "Purchasing", "Sales", "Finance", "Main Warehouse", "Branch Warehouse", "Remote Warehouse"];

function AccessCell({ access }: { access: Access }) {
  const styles: Record<Access, string> = {
    full: "bg-[var(--success-bg)] text-[var(--success)]",
    edit: "bg-[var(--info-bg)] text-[var(--info)]",
    view: "bg-[#F2F4F7] text-[#475467]",
    none: "bg-white text-ink-faint",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-medium whitespace-nowrap", styles[access])}>
      {access === "none" ? <MinusIcon size={11} aria-hidden /> : <CheckIcon size={11} weight="bold" aria-hidden />}
      {ACCESS_LABEL[access]}
    </span>
  );
}

export function PermissionPreview({ role }: { role: RoleId }) {
  const r = ROLES.find((x) => x.id === role)!;
  return (
    <div className="rounded-lg border border-line">
      <p className="border-b border-line-soft bg-[#FAFAFB] px-3 py-2 text-[12.5px] text-ink-body">
        <span className="font-medium text-ink">{r.label}</span> — {r.description}
      </p>
      <ul className="divide-y divide-line-soft">
        {PERMISSION_AREAS.map((a, i) => (
          <li key={a} className="flex items-center justify-between gap-3 px-3 py-1.5 text-[13px]">
            <span className="text-ink-body">{a}</span>
            <AccessCell access={r.access[i]} />
          </li>
        ))}
      </ul>
    </div>
  );
}

const schema = z.object({
  name: z.string().trim().min(2, "Enter the full name").max(60),
  email: z.email("Enter a valid work email"),
  role: z.string().min(1, "Choose a role"),
  team: z.string().min(1, "Choose a team"),
});
type Values = z.input<typeof schema>;

function UserDialog({ user, onClose }: { user: AppUser | null; onClose: () => void }) {
  const save = useSaveRecord("users");
  const form = useZodForm<Values>(schema, { name: user?.name ?? "", email: user?.email ?? "", role: user?.role ?? "", team: user?.team ?? "" }, "user");
  const short = (name: string) => {
    const [first, ...rest] = name.trim().split(/\s+/);
    return rest.length ? `${first} ${rest[rest.length - 1][0]}.` : first;
  };
  return (
    <FormDialog
      open
      wide
      onOpenChange={(o) => !o && onClose()}
      title={user ? `Edit ${user.name}` : "Add user"}
      description={DEMO_NOTE}
      submitLabel={user ? "Save changes" : "Add user (demo)"}
      saving={form.saving}
      onSubmit={form.handleSubmit(async (v) => {
        const saved = await save.mutateAsync({ id: user?.id ?? "", name: v.name.trim(), short: user?.short ?? short(v.name), email: v.email.trim().toLowerCase(), role: v.role as RoleId, team: v.team, status: user?.status ?? "invited", lastActive: user?.lastActive ?? null });
        toast.success(user ? "User updated" : "User added to the demo list", { description: `${saved.name} · no invitation was sent.` });
        onClose();
      })}
    >
      <TextField form={form} name="name" label="Full name" required autoComplete="off" />
      <TextField form={form} name="email" label="Work email" required type="email" autoComplete="off" />
      <ChoiceField form={form} name="role" label="Role" required options={ROLES.map((r) => ({ value: r.id, label: r.label }))} placeholder="Choose a role" />
      <ChoiceField form={form} name="team" label="Team or department" required options={TEAMS.map((t) => ({ value: t, label: t }))} placeholder="Choose a team" />
      <div className="sm:col-span-2">
        <p className="mb-1.5 text-field-label text-ink-body">Permission preview</p>
        {form.values.role ? <PermissionPreview role={form.values.role as RoleId} /> : <p className="rounded-lg bg-[#F9FAFB] px-3 py-3 text-[12.5px] text-ink-muted">Choose a role to preview what it can access.</p>}
      </div>
    </FormDialog>
  );
}

export function UsersView() {
  const { data: users } = useRecords("users");
  const save = useSaveRecord("users");
  const [tab, setTab] = useState<"users" | "roles">("users");
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState<AppUser | "new" | null>(null);

  const rows = useMemo(() => users?.filter((u) => (!role || u.role === role) && (!status || u.status === status) && matches(q, u.name, u.email, u.team)), [users, role, status, q]);
  const filtered = !!(q || role || status);
  const setUserStatus = async (u: AppUser, s: AppUser["status"]) => {
    await save.mutateAsync({ ...u, status: s });
    toast.success(s === "suspended" ? `${u.name} suspended (demo)` : `${u.name} reactivated (demo)`, { description: "Nothing changes outside this prototype." });
  };

  const columns: Column<AppUser>[] = [
    {
      key: "name",
      header: "User",
      sortValue: (u) => u.name,
      cell: (u) => (
        <span className="flex min-w-[220px] items-center gap-3">
          <span className={cn("inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", u.status === "active" ? "bg-inventory-tint text-inventory-depth" : "bg-[#F2F4F7] text-ink-muted")} aria-hidden>
            {initials(u.name)}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{u.name}</span>
            <span className="block truncate text-[12px] leading-4 text-ink-muted">{u.email}</span>
          </span>
        </span>
      ),
    },
    { key: "role", header: "Role", sortValue: (u) => roleLabel(u.role), cell: (u) => <span className="whitespace-nowrap">{roleLabel(u.role)}</span> },
    { key: "team", header: "Team", sortValue: (u) => u.team, cell: (u) => <span className="whitespace-nowrap">{u.team}</span> },
    { key: "status", header: "Status", sortValue: (u) => u.status, cell: (u) => <ToneBadge tone={USER_STATUS[u.status]} /> },
    { key: "last", header: "Last active", sortValue: (u) => u.lastActive ?? "", cell: (u) => <span className="whitespace-nowrap">{u.lastActive ? formatDateTime(u.lastActive) : <span className="text-ink-muted">Never signed in</span>}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      headerClassName: "w-12",
      cell: (u) => (
        <RowMenu
          label={`Actions for ${u.name}`}
          actions={[
            { label: "Edit", icon: PencilSimpleIcon, onSelect: () => setEditing(u) },
            u.id !== "us-admin" && (u.status === "suspended" ? { label: "Reactivate", icon: PlayCircleIcon, onSelect: () => void setUserStatus(u, "active"), separatorBefore: true } : { label: "Suspend", icon: PauseCircleIcon, onSelect: () => void setUserStatus(u, "suspended"), destructive: true, separatorBefore: true }),
          ]}
        />
      ),
    },
  ];

  return (
    <PageShell>
      <PageHeading
        crumbs={[{ label: "Administration" }, { label: "Users & Permissions" }]}
        title="Users & Permissions"
        description="Who uses EVOQ Inventory and what each role can do."
        actions={
          <PrimaryButton icon={PlusIcon} onClick={() => setEditing("new")}>
            Add User
          </PrimaryButton>
        }
      />
      <PrototypeNote className="mt-5">{DEMO_NOTE} There is no real sign-in or server-side access control in this prototype.</PrototypeNote>
      <StatRow className="mt-4">
        <StatTile label="Active users" value={users?.filter((u) => u.status === "active").length} icon={UsersThreeIcon} tone="brand" />
        <StatTile label="Invited (demo)" value={users?.filter((u) => u.status === "invited").length} icon={UserGearIcon} />
        <StatTile label="Suspended" value={users?.filter((u) => u.status === "suspended").length} icon={PauseCircleIcon} />
        <StatTile label="Roles in use" value={users ? new Set(users.map((u) => u.role)).size : undefined} note={`of ${ROLES.length} roles`} icon={ShieldCheckIcon} />
      </StatRow>
      <Card className="mt-4">
        <UnderlineTabs
          idPrefix="users"
          label="Users and roles"
          value={tab}
          onChange={setTab}
          className="px-5 pt-3"
          tabs={[
            { value: "users", label: "Users", count: users?.length },
            { value: "roles", label: "Roles & permissions", count: ROLES.length },
          ]}
        />
        {tab === "users" ? (
          <div id="users-panel-users" role="tabpanel" aria-labelledby="users-tab-users">
            <ListToolbar
              canClear={filtered}
              onClear={() => {
                setQ("");
                setRole("");
                setStatus("");
              }}
            >
              <SearchInput value={q} onChange={setQ} placeholder="Search name, email or team…" label="Search users" className="w-full sm:w-[260px]" />
              <FilterSelect label="Role" allLabel="All roles" value={role} onChange={setRole} options={ROLES.map((r) => ({ value: r.id, label: r.label }))} className="w-full sm:w-[190px]" />
              <FilterSelect label="Status" allLabel="All statuses" value={status} onChange={setStatus} options={Object.entries(USER_STATUS).map(([value, t]) => ({ value, label: t.label }))} className="w-full sm:w-[150px]" />
            </ListToolbar>
            <DataTable
              rows={rows}
              columns={columns}
              rowKey={(u) => u.id}
              onRowClick={(u) => setEditing(u)}
              caption="Users"
              noun="users"
              minWidth={860}
              defaultSort={{ key: "name", dir: "asc" }}
              resetKey={`${q}|${role}|${status}`}
              empty={<EmptyState icon={UsersThreeIcon} title="No users match" hint="Try a different search or filter." />}
            />
          </div>
        ) : (
          <div id="users-panel-roles" role="tabpanel" aria-labelledby="users-tab-roles" className="overflow-x-auto scrollbar-thin">
            <table className="w-full min-w-[980px] border-collapse">
              <caption className="sr-only">Role permission matrix (preview)</caption>
              <thead>
                <tr className="border-y border-line-soft bg-[#FAFAFB]">
                  <th scope="col" className={th}>
                    Role
                  </th>
                  {PERMISSION_AREAS.map((a) => (
                    <th key={a} scope="col" className={th}>
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLES.map((r) => (
                  <tr key={r.id} className="border-b border-line-soft last:border-0">
                    <th scope="row" className={cn(td, "text-left font-normal")}>
                      <span className="block font-semibold text-ink">{r.label}</span>
                      <span className="block text-[12px] leading-4 text-ink-muted">{users?.filter((u) => u.role === r.id).length ?? 0} user(s)</span>
                    </th>
                    {r.access.map((a, i) => (
                      <td key={i} className={td}>
                        <AccessCell access={a} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-5 py-3 text-[12px] leading-4 text-ink-muted">Preview of how roles could be set up. Nothing on this matrix is enforced.</p>
          </div>
        )}
      </Card>
      {editing && <UserDialog key={editing === "new" ? "new" : editing.id} user={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </PageShell>
  );
}
