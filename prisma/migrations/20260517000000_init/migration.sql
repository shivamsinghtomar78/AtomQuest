-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- EnableExtension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('employee', 'manager', 'admin');

-- CreateEnum
CREATE TYPE "goal_sheet_status" AS ENUM ('draft', 'submitted', 'returned', 'approved', 'locked');

-- CreateEnum
CREATE TYPE "uom_type" AS ENUM ('min_numeric', 'min_percent', 'max_numeric', 'max_percent', 'timeline', 'zero');

-- CreateEnum
CREATE TYPE "quarter" AS ENUM ('Q1', 'Q2', 'Q3', 'Q4');

-- CreateEnum
CREATE TYPE "quarterly_status" AS ENUM ('not_started', 'on_track', 'completed');

-- CreateEnum
CREATE TYPE "audit_actor_role" AS ENUM ('employee', 'manager', 'admin');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "password_hash" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'employee',
    "department" VARCHAR(255),
    "designation" VARCHAR(255),
    "manager_id" UUID,
    "employee_code" VARCHAR(50),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar_url" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_cycles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "goal_setting_opens" DATE NOT NULL,
    "q1_opens" DATE NOT NULL,
    "q2_opens" DATE NOT NULL,
    "q3_opens" DATE NOT NULL,
    "q4_opens" DATE NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goal_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_sheets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "employee_id" UUID NOT NULL,
    "cycle_id" UUID NOT NULL,
    "status" "goal_sheet_status" NOT NULL DEFAULT 'draft',
    "submitted_at" TIMESTAMPTZ(6),
    "approved_at" TIMESTAMPTZ(6),
    "approved_by" UUID,
    "locked_at" TIMESTAMPTZ(6),
    "manager_remarks" TEXT,
    "total_weightage" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goal_sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thrust_areas" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "color_hex" VARCHAR(7) NOT NULL DEFAULT '#2563EB',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thrust_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goals" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sheet_id" UUID NOT NULL,
    "thrust_area_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "uom_type" "uom_type" NOT NULL,
    "target_value" DECIMAL(15,4),
    "target_date" DATE,
    "weightage" DECIMAL(5,2) NOT NULL,
    "is_shared" BOOLEAN NOT NULL DEFAULT false,
    "shared_from_goal_id" UUID,
    "primary_owner_id" UUID,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,
    "display_order" INTEGER NOT NULL DEFAULT 0,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quarterly_updates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "goal_id" UUID NOT NULL,
    "quarter" "quarter" NOT NULL,
    "actual_value" DECIMAL(15,4),
    "actual_date" DATE,
    "actual_zero" BOOLEAN,
    "status" "quarterly_status" NOT NULL DEFAULT 'not_started',
    "computed_score" DECIMAL(8,4),
    "employee_notes" TEXT,
    "is_window_open" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quarterly_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "checkin_comments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sheet_id" UUID NOT NULL,
    "manager_id" UUID NOT NULL,
    "quarter" "quarter" NOT NULL,
    "overall_comment" TEXT NOT NULL,
    "key_observations" TEXT,
    "areas_of_improvement" TEXT,
    "support_required" TEXT,
    "checkin_date" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "checkin_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "action" VARCHAR(100) NOT NULL,
    "changed_by" UUID NOT NULL,
    "changed_by_role" "audit_actor_role" NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "reason" TEXT,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipient_id" UUID NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "body" TEXT,
    "entity_type" VARCHAR(50),
    "entity_id" UUID,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "escalation_rules" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cycle_id" UUID,
    "trigger_event" VARCHAR(100) NOT NULL,
    "days_threshold" INTEGER NOT NULL,
    "notify_employee" BOOLEAN NOT NULL DEFAULT true,
    "notify_manager" BOOLEAN NOT NULL DEFAULT true,
    "notify_admin" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "escalation_rules_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_code_key" ON "users"("employee_code");

-- CreateIndex
CREATE INDEX "idx_users_manager_id" ON "users"("manager_id");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role");

-- CreateIndex
CREATE INDEX "idx_users_department" ON "users"("department");

-- CreateIndex
CREATE INDEX "idx_goal_sheets_employee" ON "goal_sheets"("employee_id");

-- CreateIndex
CREATE INDEX "idx_goal_sheets_status" ON "goal_sheets"("status");

-- CreateIndex
CREATE INDEX "idx_goal_sheets_cycle" ON "goal_sheets"("cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_goal_sheets_employee_cycle" ON "goal_sheets"("employee_id", "cycle_id");

-- CreateIndex
CREATE UNIQUE INDEX "thrust_areas_name_key" ON "thrust_areas"("name");

-- CreateIndex
CREATE INDEX "idx_goals_sheet" ON "goals"("sheet_id");

-- CreateIndex
CREATE INDEX "idx_goals_shared_from" ON "goals"("shared_from_goal_id");

-- CreateIndex
CREATE INDEX "idx_goals_primary_owner" ON "goals"("primary_owner_id");

-- CreateIndex
CREATE INDEX "idx_goals_deleted_at" ON "goals"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_quarterly_updates_goal_quarter" ON "quarterly_updates"("goal_id", "quarter");

-- CreateIndex
CREATE UNIQUE INDEX "uq_checkin_comments_sheet_quarter" ON "checkin_comments"("sheet_id", "quarter");

-- CreateIndex
CREATE INDEX "idx_audit_entity" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "idx_audit_changed_by" ON "audit_logs"("changed_by");

-- CreateIndex
CREATE INDEX "idx_audit_created" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_notif_recipient" ON "notifications"("recipient_id", "is_read", "created_at" DESC);

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_cycles" ADD CONSTRAINT "goal_cycles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_sheets" ADD CONSTRAINT "goal_sheets_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_sheets" ADD CONSTRAINT "goal_sheets_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "goal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_sheets" ADD CONSTRAINT "goal_sheets_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thrust_areas" ADD CONSTRAINT "thrust_areas_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "goal_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_thrust_area_id_fkey" FOREIGN KEY ("thrust_area_id") REFERENCES "thrust_areas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_shared_from_goal_id_fkey" FOREIGN KEY ("shared_from_goal_id") REFERENCES "goals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_primary_owner_id_fkey" FOREIGN KEY ("primary_owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quarterly_updates" ADD CONSTRAINT "quarterly_updates_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_comments" ADD CONSTRAINT "checkin_comments_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "goal_sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "checkin_comments" ADD CONSTRAINT "checkin_comments_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "goal_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "goals" ADD CONSTRAINT "goals_weightage_min_check" CHECK ("weightage" >= 10.00);

-- AddCheckConstraint
ALTER TABLE "goals" ADD CONSTRAINT "goals_weightage_max_check" CHECK ("weightage" <= 100.00);

-- AddCheckConstraint
ALTER TABLE "goal_sheets" ADD CONSTRAINT "goal_sheets_total_weightage_range_check" CHECK ("total_weightage" >= 0.00 AND "total_weightage" <= 100.00);

-- AddCheckConstraint
ALTER TABLE "escalation_rules" ADD CONSTRAINT "escalation_rules_days_threshold_positive_check" CHECK ("days_threshold" > 0);

-- CreateFunction
CREATE OR REPLACE FUNCTION compute_sheet_weightage(sheet_uuid UUID)
RETURNS NUMERIC AS $$
  SELECT COALESCE(SUM("weightage"), 0)
  FROM "goals"
  WHERE "sheet_id" = sheet_uuid;
$$ LANGUAGE SQL STABLE;

-- CreateFunction
CREATE OR REPLACE FUNCTION prevent_audit_log_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

-- CreateTrigger
CREATE TRIGGER audit_logs_no_update
BEFORE UPDATE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

-- CreateTrigger
CREATE TRIGGER audit_logs_no_delete
BEFORE DELETE ON "audit_logs"
FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();

