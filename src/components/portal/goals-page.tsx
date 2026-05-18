"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, Lock, Plus, Save, Share2, SlidersHorizontal, Target, Trash2, X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  ConfirmDialog,
  EmptyState,
  InlineValidation,
  PageHeader,
  PortalCard,
  ProgressBar,
  SkeletonBlock,
  StatusBadge,
} from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";
import { apiJson, jsonRequest } from "@/lib/api/client";

type SheetStatus = "draft" | "submitted" | "returned" | "approved" | "locked";
type UomType = "min_numeric" | "min_percent" | "max_numeric" | "max_percent" | "timeline" | "zero";

type ThrustArea = {
  id: string;
  name: string;
  colorHex: string;
};

type Goal = {
  id: string;
  thrustAreaId: string;
  thrustArea: ThrustArea;
  title: string;
  description: string | null;
  uomType: UomType;
  targetValue: string | number | null;
  targetDate: string | null;
  weightage: string | number;
  isLocked: boolean;
  isShared: boolean;
};

type GoalSheet = {
  id: string;
  status: SheetStatus;
  totalWeightage: string | number;
  goals: Goal[];
};

const goalSchema = z
  .object({
    thrustAreaId: z.string().uuid("Choose a thrust area."),
    title: z.string().min(10, "Use at least 10 characters.").max(500),
    description: z.string().max(2000).optional(),
    uomType: z.enum(["min_numeric", "min_percent", "max_numeric", "max_percent", "timeline", "zero"]),
    targetValue: z.string().optional(),
    targetDate: z.string().optional(),
    weightage: z.number().min(10, "Minimum weightage is 10%.").max(100, "Maximum weightage is 100%."),
  })
  .superRefine((value, ctx) => {
    if (!["timeline", "zero"].includes(value.uomType) && !value.targetValue) {
      ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Target value is required." });
    }
    if (value.uomType === "timeline" && !value.targetDate) {
      ctx.addIssue({ code: "custom", path: ["targetDate"], message: "Target date is required." });
    }
  });

type GoalFormValues = z.infer<typeof goalSchema>;

const tabs = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Submitted", value: "submitted" },
  { label: "Approved", value: "approved" },
  { label: "Locked", value: "locked" },
  { label: "Shared", value: "shared" },
];

async function fetchMySheet() {
  const data = await apiJson<{ items: GoalSheet[] }>("/api/goal-sheets");
  return data.items[0] ?? null;
}

async function fetchThrustAreas() {
  return apiJson<ThrustArea[]>("/api/thrust-areas");
}

function numberValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function uomLabel(type: UomType) {
  const labels: Record<UomType, string> = {
    min_numeric: "Min #",
    min_percent: "Min %",
    max_numeric: "Max #",
    max_percent: "Max %",
    timeline: "Timeline",
    zero: "Zero",
  };
  return labels[type];
}

function targetLabel(goal: Goal) {
  if (goal.uomType === "timeline") return goal.targetDate?.slice(0, 10) ?? "No date";
  if (goal.uomType === "zero") return "0";
  return goal.targetValue?.toString() ?? "No target";
}

export function GoalsPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [goalPendingDelete, setGoalPendingDelete] = useState<Goal | null>(null);
  const activeTab = searchParams.get("tab") ?? "all";
  const modalMode = searchParams.get("modal");
  const editingGoalId = searchParams.get("goal");
  const modalOpen = modalMode === "add-goal" || modalMode === "edit-goal";

  const sheetQuery = useQuery({ queryKey: ["goal-sheets", "mine"], queryFn: fetchMySheet });
  const thrustQuery = useQuery({ queryKey: ["thrust-areas"], queryFn: fetchThrustAreas });
  const sheet = sheetQuery.data;
  const goals = sheet?.goals ?? [];
  const weightage = numberValue(sheet?.totalWeightage);
  const remaining = Math.max(0, 100 - weightage);
  const sheetEditable = !sheet || ["draft", "returned"].includes(sheet.status);
  const editingGoal = editingGoalId ? goals.find((goal) => goal.id === editingGoalId) ?? null : null;
  const availableWeightage = editingGoal
    ? Math.max(0, 100 - weightage + numberValue(editingGoal.weightage))
    : remaining;
  const addDisabledReason = !sheetEditable
    ? "This sheet is locked for employee edits."
    : goals.length >= 8
      ? "A sheet can contain at most 8 goals."
      : remaining === 0
        ? "Free some weightage before adding another goal."
        : null;
  const submitIssues = [
    goals.length === 0 ? "Add at least one goal." : null,
    weightage !== 100 ? "Total weightage must be exactly 100%." : null,
    !sheetEditable ? "Only draft or returned sheets can be submitted." : null,
  ].filter((item): item is string => Boolean(item));

  const createSheet = useMutation({
    mutationFn: () => apiJson<GoalSheet>("/api/goal-sheets", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["goal-sheets", "mine"] }),
  });

  const saveGoal = useMutation({
    mutationFn: async (values: GoalFormValues) => {
      const activeSheet = sheet ?? (await createSheet.mutateAsync());
      const body = {
        sheet_id: activeSheet.id,
        thrust_area_id: values.thrustAreaId,
        title: values.title,
        description: values.description,
        uom_type: values.uomType,
        target_value: values.uomType === "timeline" || values.uomType === "zero" ? null : Number(values.targetValue),
        target_date: values.uomType === "timeline" ? values.targetDate : null,
        weightage: values.weightage,
      };

      return editingGoal
        ? apiJson<Goal>(`/api/goals/${editingGoal.id}`, jsonRequest("PATCH", {
            thrust_area_id: body.thrust_area_id,
            title: body.title,
            description: body.description,
            uom_type: body.uom_type,
            target_value: body.target_value,
            target_date: body.target_date,
            weightage: body.weightage,
          }))
        : apiJson<Goal>("/api/goals", jsonRequest("POST", body));
    },
    onSuccess: () => {
      toast.success(editingGoal ? "Goal updated" : "Goal saved in draft sheet");
      queryClient.invalidateQueries({ queryKey: ["goal-sheets", "mine"] });
      closeModal();
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to save goal"),
  });

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => apiJson(`/api/goals/${goalId}`, { method: "DELETE" }),
    onMutate: () => toast.loading("Deleting goal...", { id: "delete-goal" }),
    onSuccess: () => {
      toast.success("Draft goal removed", { id: "delete-goal" });
      setGoalPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["goal-sheets", "mine"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to delete goal", { id: "delete-goal" }),
  });

  const submitSheet = useMutation({
    mutationFn: () => apiJson(`/api/goal-sheets/${sheet?.id}/submit`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Goal sheet submitted for approval");
      queryClient.invalidateQueries({ queryKey: ["goal-sheets", "mine"] });
      queryClient.invalidateQueries({ queryKey: ["notifications", "unread-count"] });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Unable to submit sheet"),
  });

  const filteredGoals = useMemo(() => {
    if (activeTab === "all") return goals;
    if (activeTab === "shared") return goals.filter((goal) => goal.isShared);
    return goals.filter(() => sheet?.status === activeTab);
  }, [activeTab, goals, sheet?.status]);

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams);
    params.set("tab", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  function openModal() {
    const params = new URLSearchParams(searchParams);
    params.set("modal", "add-goal");
    params.delete("goal");
    router.push(`${pathname}?${params.toString()}`);
  }

  function openEdit(goalId: string) {
    const params = new URLSearchParams(searchParams);
    params.set("modal", "edit-goal");
    params.set("goal", goalId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function closeModal() {
    const params = new URLSearchParams(searchParams);
    params.delete("modal");
    params.delete("goal");
    router.push(params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  if (sheetQuery.isLoading) {
    return (
      <div className="portal-page">
        <SkeletonBlock className="page-title-row" />
        <div className="goal-card-grid">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="portal-page">
      <PageHeader
        eyebrow="My Goals"
        title="FY 2025-26 goal sheet"
        description="Use 1 to 8 goals, minimum 10% per goal, exactly 100% before submission."
        actions={(
          <Button disabled={Boolean(addDisabledReason)} onClick={openModal} title={addDisabledReason ?? undefined}>
          <Plus size={16} />
          Add Goal
          </Button>
        )}
      />
      {addDisabledReason ? <InlineValidation tone="warning">{addDisabledReason}</InlineValidation> : null}

      <PortalCard className="weightage-panel">
        <div className="weightage-panel-top">
          <strong>{goals.length} of 8 goals</strong>
          <span className={cn(weightage === 100 && "is-complete", weightage > 94 && weightage < 100 && "is-warning")}>
            {weightage.toFixed(1)}% used
          </span>
        </div>
        <ProgressBar value={weightage} tone={weightage === 100 ? "success" : weightage > 94 ? "warning" : "blue"} />
      </PortalCard>

      <div className="portal-tabs" role="tablist">
        {tabs.map((tab) => (
          <button className={activeTab === tab.value ? "is-active" : ""} key={tab.value} onClick={() => setTab(tab.value)} role="tab" type="button">
            {tab.label}
          </button>
        ))}
      </div>

      {filteredGoals.length ? (
        <div className="goal-card-grid">
          {filteredGoals.map((goal) => (
            <article className={cn("goal-card", goal.isLocked && "is-locked")} key={goal.id}>
              <div className="goal-card-top">
                <span className="thrust-pill" style={{ "--thrust-color": goal.thrustArea.colorHex } as React.CSSProperties}>
                  {goal.thrustArea.name}
                </span>
                {goal.isLocked ? <Lock size={17} /> : null}
              </div>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <div className="goal-card-meta">
                <span>{uomLabel(goal.uomType)}</span>
                <span>{targetLabel(goal)}</span>
                <span>{numberValue(goal.weightage)}%</span>
                {goal.isShared ? (
                  <span className="shared-pill">
                    <Share2 size={13} />
                    Shared Goal
                  </span>
                ) : null}
              </div>
              <div className="goal-card-footer">
                <StatusBadge status={sheet?.status ?? "draft"} />
                <div>
                  <button
                    disabled={!sheetEditable || goal.isLocked || goal.isShared}
                    onClick={() => openEdit(goal.id)}
                    title={!sheetEditable || goal.isLocked || goal.isShared ? "This goal cannot be edited in its current state." : "Edit goal"}
                    type="button"
                  >
                    <SlidersHorizontal size={16} />
                  </button>
                  <button
                    disabled={!sheetEditable || goal.isLocked || goal.isShared}
                    onClick={() => setGoalPendingDelete(goal)}
                    title={!sheetEditable || goal.isLocked || goal.isShared ? "This goal cannot be deleted in its current state." : "Delete goal"}
                    type="button"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {sheetEditable && goals.length < 8 && remaining > 0 ? (
            <button className="add-goal-card" onClick={openModal} type="button">
              <Plus size={22} />
              <span>Add Goal</span>
            </button>
          ) : null}
        </div>
      ) : (
        <EmptyState
          action={sheetEditable ? <Button onClick={openModal}>Add First Goal</Button> : undefined}
          description="Add your first goal to get started. You can add up to 8 goals."
          title="No goals added yet"
        />
      )}

      <div className="submit-bar">
        <div>
          <span>Goals: {goals.length > 0 ? "OK" : "Missing"} {goals.length}/8</span>
          <span>Weightage: {weightage === 100 ? "OK" : "Needs work"} {weightage}%</span>
          {sheet ? <StatusBadge status={sheet.status} /> : null}
          {submitIssues[0] ? <span>{submitIssues[0]}</span> : null}
        </div>
        <Button disabled={!sheet || submitIssues.length > 0 || submitSheet.isPending} onClick={() => submitSheet.mutate()} title={submitIssues.join(" ") || undefined}>
          {submitSheet.isPending ? "Submitting..." : "Submit for Approval"}
        </Button>
      </div>

      <GoalModal
        currentWeightage={editingGoal ? weightage - numberValue(editingGoal.weightage) : weightage}
        initialGoal={editingGoal}
        loading={saveGoal.isPending || createSheet.isPending}
        mode={editingGoal ? "edit" : "add"}
        onClose={closeModal}
        onSubmit={(values) => saveGoal.mutate(values)}
        open={modalOpen}
        remaining={availableWeightage || 100}
        thrustAreas={thrustQuery.data ?? []}
      />
      <ConfirmDialog
        danger
        confirmLabel="Delete Goal"
        description={`Delete "${goalPendingDelete?.title ?? "this goal"}" from your draft sheet? The sheet weightage will be recalculated.`}
        loading={deleteGoal.isPending}
        onCancel={() => setGoalPendingDelete(null)}
        onConfirm={() => goalPendingDelete && deleteGoal.mutate(goalPendingDelete.id)}
        open={Boolean(goalPendingDelete)}
        title="Delete draft goal"
      />
    </div>
  );
}

function GoalModal({
  currentWeightage,
  initialGoal,
  loading,
  mode,
  open,
  remaining,
  thrustAreas,
  onClose,
  onSubmit,
}: {
  currentWeightage: number;
  initialGoal?: Goal | null;
  loading: boolean;
  mode: "add" | "edit";
  open: boolean;
  remaining: number;
  thrustAreas: ThrustArea[];
  onClose: () => void;
  onSubmit: (values: GoalFormValues) => void;
}) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    values: {
      thrustAreaId: initialGoal?.thrustAreaId ?? thrustAreas[0]?.id ?? "00000000-0000-0000-0000-000000000000",
      title: initialGoal?.title ?? "",
      description: initialGoal?.description ?? "",
      uomType: initialGoal?.uomType ?? "min_numeric",
      targetValue: initialGoal?.targetValue?.toString() ?? "",
      targetDate: initialGoal?.targetDate?.slice(0, 10) ?? "",
      weightage: initialGoal ? numberValue(initialGoal.weightage) : Math.min(Math.max(remaining || 10, 10), 25),
    },
  });
  const uomType = form.watch("uomType");
  const weightage = form.watch("weightage") || 0;

  if (!open) return null;

  return (
    <div className="portal-modal-layer">
      <button aria-label="Close modal" className="portal-modal-backdrop" onClick={onClose} type="button" />
      <form className="goal-modal" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="modal-header">
          <div>
            <span>Draft mode</span>
            <h3>{mode === "edit" ? "Edit Goal" : "Add New Goal"}</h3>
          </div>
          <button aria-label="Close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <label className="form-field">
          <span>Thrust Area</span>
          <select {...form.register("thrustAreaId")}>
            {thrustAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          {form.formState.errors.thrustAreaId ? <small>{form.formState.errors.thrustAreaId.message}</small> : null}
        </label>

        <label className="form-field">
          <span>Goal Title</span>
          <input placeholder="Improve customer renewal motion" {...form.register("title")} />
          <em>{form.watch("title")?.length ?? 0}/500</em>
          {form.formState.errors.title ? <small>{form.formState.errors.title.message}</small> : null}
        </label>

        <label className="form-field">
          <span>Description</span>
          <textarea rows={3} placeholder="Add success criteria and expected outcome." {...form.register("description")} />
          {form.formState.errors.description ? <small>{form.formState.errors.description.message}</small> : null}
        </label>

        <div className="form-field">
          <span>Unit of Measurement</span>
          <div className="uom-grid">
            {[
              ["min_numeric", "Min #", "Higher is better"],
              ["min_percent", "Min %", "Higher percentage is better"],
              ["max_numeric", "Max #", "Lower is better"],
              ["max_percent", "Max %", "Lower percentage is better"],
              ["timeline", "Timeline", "Complete by date"],
              ["zero", "Zero", "Zero means success"],
            ].map(([value, label, help]) => (
              <label className={uomType === value ? "is-selected" : ""} key={value}>
                <input type="radio" value={value} {...form.register("uomType")} />
                <Target size={18} />
                <strong>{label}</strong>
                <small>{help}</small>
              </label>
            ))}
          </div>
        </div>

        {uomType === "timeline" ? (
          <label className="form-field">
            <span>Target Date</span>
            <input type="date" {...form.register("targetDate")} />
            {form.formState.errors.targetDate ? <small>{form.formState.errors.targetDate.message}</small> : null}
          </label>
        ) : uomType === "zero" ? (
          <div className="zero-info">
            <CalendarClock size={18} />
            Zero UoM uses a fixed target of 0. Actual 0 scores 100%, any incident scores 0%.
          </div>
        ) : (
          <label className="form-field">
            <span>Target</span>
            <input placeholder="100" {...form.register("targetValue")} />
            {form.formState.errors.targetValue ? <small>{form.formState.errors.targetValue.message}</small> : null}
          </label>
        )}

        <label className="form-field">
          <span>Weightage (%)</span>
          <input max={Math.max(10, remaining)} min={10} step={0.5} type="range" {...form.register("weightage", { valueAsNumber: true })} />
          <input max={Math.max(10, remaining)} min={10} step={0.5} type="number" {...form.register("weightage", { valueAsNumber: true })} />
          <em>Remaining after this: {Math.max(0, 100 - currentWeightage - Number(weightage)).toFixed(1)}%</em>
          {form.formState.errors.weightage ? <small>{form.formState.errors.weightage.message}</small> : null}
        </label>

        <div className="modal-footer">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={loading || thrustAreas.length === 0} type="submit">
            <Save size={16} />
            {loading ? "Saving..." : mode === "edit" ? "Update Goal" : "Save Goal"}
          </Button>
        </div>
      </form>
    </div>
  );
}
