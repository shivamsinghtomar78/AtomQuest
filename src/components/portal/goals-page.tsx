"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarClock, Lock, Plus, Save, Share2, SlidersHorizontal, Target, Trash2, X } from "lucide-react";
import { demoGoals, getWeightageUsed, thrustAreas, uomLabel, type PortalGoal, type UomType } from "@/lib/portal-data";
import { Button } from "@/components/ui/button";
import { EmptyState, PortalCard, ProgressBar, StatusBadge } from "@/components/portal/portal-ui";
import { cn } from "@/lib/utils";

const goalSchema = z
  .object({
    thrustArea: z.string().min(1, "Choose a thrust area."),
    title: z.string().min(10, "Use at least 10 characters.").max(500),
    description: z.string().max(2000).optional(),
    uomType: z.enum(["min_numeric", "min_percent", "max_numeric", "max_percent", "timeline", "zero"]),
    targetValue: z.string().optional(),
    targetDate: z.string().optional(),
    weightage: z.number().min(10, "Minimum weightage is 10%.").max(100, "Maximum weightage is 100%."),
  })
  .superRefine((value, ctx) => {
    if (value.uomType !== "timeline" && value.uomType !== "zero" && !value.targetValue) {
      ctx.addIssue({ code: "custom", path: ["targetValue"], message: "Target value is required." });
    }
    if (value.uomType === "timeline" && !value.targetDate) {
      ctx.addIssue({ code: "custom", path: ["targetDate"], message: "Target date is required." });
    }
  });

type GoalFormValues = z.infer<typeof goalSchema>;

const tabs = ["All Goals", "Draft", "Submitted", "Approved", "Shared Goals"];

export function GoalsPage() {
  const [goals, setGoals] = useState<PortalGoal[]>(demoGoals);
  const [activeTab, setActiveTab] = useState("All Goals");
  const [modalOpen, setModalOpen] = useState(false);
  const weightage = getWeightageUsed(goals);
  const remaining = Math.max(0, 100 - weightage);
  const sheetEditable = weightage < 100 || goals.some((goal) => !goal.isLocked);

  const filteredGoals = useMemo(() => {
    if (activeTab === "All Goals") return goals;
    if (activeTab === "Shared Goals") return goals.filter((goal) => goal.isShared);
    return goals.filter((goal) => goal.status === activeTab.toLowerCase());
  }, [activeTab, goals]);

  function addGoal(values: GoalFormValues) {
    const area = thrustAreas.find((item) => item.id === values.thrustArea) ?? thrustAreas[0];
    const nextWeightage = weightage + values.weightage;
    if (nextWeightage > 100) {
      toast.error("Total weightage cannot exceed 100%.");
      return;
    }
    if (goals.length >= 8) {
      toast.error("Maximum 8 goals allowed per sheet.");
      return;
    }

    setGoals((current) => [
      ...current,
      {
        id: `goal-${Date.now()}`,
        thrustArea: area.name,
        color: area.color,
        title: values.title,
        description: values.description ?? "New goal added from the portal form.",
        uomType: values.uomType,
        target: values.uomType === "timeline" ? values.targetDate ?? "" : values.uomType === "zero" ? "0 incidents" : values.targetValue ?? "",
        weightage: values.weightage,
        status: "draft",
        isLocked: false,
        isShared: false,
        score: null,
        updates: {
          Q1: { actual: "Pending", score: null, status: "not_started" },
          Q2: { actual: "Pending", score: null, status: "not_started" },
          Q3: { actual: "Pending", score: null, status: "not_started" },
          Q4: { actual: "Pending", score: null, status: "not_started" },
        },
      },
    ]);
    setModalOpen(false);
    toast.success("Goal saved in draft sheet.");
  }

  function deleteGoal(goalId: string) {
    setGoals((current) => current.filter((goal) => goal.id !== goalId));
    toast.info("Draft goal removed.");
  }

  return (
    <div className="portal-page">
      <div className="page-title-row">
        <div>
          <span>My Goals</span>
          <h2>FY 2025-26 goal sheet</h2>
          <p>Use 1 to 8 goals, minimum 10% per goal, exactly 100% before submission.</p>
        </div>
        <Button disabled={goals.length >= 8 || remaining === 0} onClick={() => setModalOpen(true)}>
          <Plus size={16} />
          Add Goal
        </Button>
      </div>

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
          <button className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)} role="tab" type="button">
            {tab}
          </button>
        ))}
      </div>

      {filteredGoals.length ? (
        <div className="goal-card-grid">
          {filteredGoals.map((goal) => (
            <article className={cn("goal-card", goal.isLocked && "is-locked")} key={goal.id}>
              <div className="goal-card-top">
                <span className="thrust-pill" style={{ "--thrust-color": goal.color } as React.CSSProperties}>
                  {goal.thrustArea}
                </span>
                {goal.isLocked ? <Lock size={17} /> : null}
              </div>
              <h3>{goal.title}</h3>
              <p>{goal.description}</p>
              <div className="goal-card-meta">
                <span>{uomLabel(goal.uomType)}</span>
                <span>{goal.target}</span>
                <span>{goal.weightage}%</span>
                {goal.isShared ? (
                  <span className="shared-pill">
                    <Share2 size={13} />
                    Shared Goal
                  </span>
                ) : null}
              </div>
              <div className="goal-card-footer">
                <StatusBadge status={goal.status} />
                <div>
                  <button disabled={goal.isLocked || goal.isShared} type="button">
                    <SlidersHorizontal size={16} />
                  </button>
                  <button disabled={goal.isLocked || goal.isShared} onClick={() => deleteGoal(goal.id)} type="button">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </article>
          ))}
          {sheetEditable && goals.length < 8 && remaining > 0 ? (
            <button className="add-goal-card" onClick={() => setModalOpen(true)} type="button">
              <Plus size={22} />
              <span>Add Goal</span>
            </button>
          ) : null}
        </div>
      ) : (
        <EmptyState
          action={<Button onClick={() => setModalOpen(true)}>Add your first goal</Button>}
          description="Start with a draft goal and build up to exactly 100% weightage."
          title="No goals in this view"
        />
      )}

      <div className="submit-bar">
        <div>
          <span>Goals: {goals.length > 0 ? "OK" : "Missing"} {goals.length}/8</span>
          <span>Weightage: {weightage === 100 ? "OK" : "Needs work"} {weightage}%</span>
        </div>
        <Button disabled={weightage !== 100 || goals.length === 0} onClick={() => toast.success("Goal sheet submitted for approval.")}>
          Submit for Approval
        </Button>
      </div>

      <GoalModal
        currentWeightage={weightage}
        onClose={() => setModalOpen(false)}
        onSubmit={addGoal}
        open={modalOpen}
        remaining={remaining}
      />
    </div>
  );
}

function GoalModal({
  currentWeightage,
  open,
  remaining,
  onClose,
  onSubmit,
}: {
  currentWeightage: number;
  open: boolean;
  remaining: number;
  onClose: () => void;
  onSubmit: (values: GoalFormValues) => void;
}) {
  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      thrustArea: "revenue",
      title: "",
      description: "",
      uomType: "min_numeric",
      targetValue: "",
      targetDate: "",
      weightage: Math.min(Math.max(remaining || 10, 10), 25),
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
            <h3>Add New Goal</h3>
          </div>
          <button aria-label="Close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <label className="form-field">
          <span>Thrust Area</span>
          <select {...form.register("thrustArea")}>
            {thrustAreas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
          {form.formState.errors.thrustArea ? <small>{form.formState.errors.thrustArea.message}</small> : null}
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
              ["min_numeric", "Min", "Higher is better"],
              ["max_numeric", "Max", "Lower is better"],
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
          <Button type="submit">
            <Save size={16} />
            Save Goal
          </Button>
        </div>
      </form>
    </div>
  );
}
