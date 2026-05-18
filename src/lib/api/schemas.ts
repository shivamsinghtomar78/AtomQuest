import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const roleSchema = z.enum(["employee", "manager", "admin"]);
export const sheetStatusSchema = z.enum([
  "draft",
  "submitted",
  "returned",
  "approved",
  "locked",
]);
export const uomTypeSchema = z.enum([
  "min_numeric",
  "min_percent",
  "max_numeric",
  "max_percent",
  "timeline",
  "zero",
]);
export const quarterSchema = z.enum(["Q1", "Q2", "Q3", "Q4"]);
export const quarterlyStatusSchema = z.enum([
  "not_started",
  "on_track",
  "completed",
]);

export const optionalText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => value || null);

const baseGoalBodySchema = z.object({
    sheet_id: uuidSchema,
    thrust_area_id: uuidSchema,
    title: z.string().trim().min(10).max(500),
    description: optionalText(2000),
    uom_type: uomTypeSchema,
    target_value: z.coerce.number().finite().optional().nullable(),
    target_date: z.string().date().optional().nullable(),
    weightage: z.coerce
      .number()
      .min(10)
      .max(100)
      .refine((value) => Number.isInteger(value * 2), {
        message: "Weightage must use 0.5 increments",
      }),
  });

export const goalBodySchema = baseGoalBodySchema.superRefine((value, context) => {
    const numeric = !["timeline", "zero"].includes(value.uom_type);
    if (numeric && value.target_value === undefined) {
      context.addIssue({
        code: "custom",
        path: ["target_value"],
        message: "Target value is required for numeric and percent goals",
      });
    }

    if (value.uom_type === "timeline" && !value.target_date) {
      context.addIssue({
        code: "custom",
        path: ["target_date"],
        message: "Target date is required for timeline goals",
      });
    }
});

export const goalPatchSchema = baseGoalBodySchema
  .omit({ sheet_id: true })
  .partial()
  .superRefine((value, context) => {
    if (!value.uom_type) return;
    const numeric = !["timeline", "zero"].includes(value.uom_type);

    if (numeric && value.target_value === undefined) {
      context.addIssue({
        code: "custom",
        path: ["target_value"],
        message: "Target value is required for numeric and percent goals",
      });
    }

    if (value.uom_type === "timeline" && !value.target_date) {
      context.addIssue({
        code: "custom",
        path: ["target_date"],
        message: "Target date is required for timeline goals",
      });
    }
  });

export const approveSheetSchema = z.object({
  approved: z.boolean(),
  remarks: z.string().trim().max(2000).optional().nullable(),
  updated_goals: z
    .array(
      z.object({
        id: uuidSchema,
        target_value: z.coerce.number().finite().optional().nullable(),
        target_date: z.string().date().optional().nullable(),
        weightage: z.coerce.number().min(10).max(100).optional(),
      })
    )
    .optional()
    .default([]),
});

export const unlockSheetSchema = z.object({
  reason: z.string().trim().min(20).max(2000),
});

export const shareGoalSchema = z
  .object({
    title: z.string().trim().min(10).max(500),
    description: optionalText(2000),
    thrust_area_id: uuidSchema,
    uom_type: uomTypeSchema,
    target_value: z.coerce.number().finite().optional().nullable(),
    target_date: z.string().date().optional().nullable(),
    recipient_employee_ids: z.array(uuidSchema).min(1).max(100),
    cycle_id: uuidSchema,
    suggested_weightage: z.coerce.number().min(10).max(100),
  })
  .superRefine((value, context) => {
    const numeric = !["timeline", "zero"].includes(value.uom_type);
    if (numeric && value.target_value === undefined) {
      context.addIssue({
        code: "custom",
        path: ["target_value"],
        message: "Target value is required for numeric and percent goals",
      });
    }

    if (value.uom_type === "timeline" && !value.target_date) {
      context.addIssue({
        code: "custom",
        path: ["target_date"],
        message: "Target date is required for timeline goals",
      });
    }
  });

export const quarterlyUpdateSchema = z
  .object({
    goal_id: uuidSchema,
    quarter: quarterSchema,
    actual_value: z.coerce.number().finite().optional().nullable(),
    actual_date: z.string().date().optional().nullable(),
    actual_zero: z.boolean().optional().nullable(),
    status: quarterlyStatusSchema,
    employee_notes: optionalText(1000),
  })
  .superRefine((value, context) => {
    if (value.status === "not_started") return;

    if (value.actual_value === undefined && value.actual_date === undefined && value.actual_zero === undefined) {
      context.addIssue({
        code: "custom",
        message: "An actual value, actual date, or zero result is required",
      });
    }
  });

export const checkinCommentSchema = z.object({
  sheet_id: uuidSchema,
  quarter: quarterSchema,
  overall_comment: z.string().trim().min(20).max(4000),
  key_observations: optionalText(4000),
  areas_of_improvement: optionalText(4000),
  support_required: optionalText(4000),
});

export const cycleCreateSchema = z.object({
  name: z.string().trim().min(3).max(255),
  goal_setting_opens: z.string().date(),
  q1_opens: z.string().date(),
  q2_opens: z.string().date(),
  q3_opens: z.string().date(),
  q4_opens: z.string().date(),
  is_active: z.boolean().optional().default(true),
});

export const cyclePatchSchema = cycleCreateSchema.partial();

const optionalPatchText = (max = 2000) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value === undefined ? undefined : value || null));

export const profilePatchSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  department: optionalPatchText(255),
  designation: optionalPatchText(255),
});

export const thrustAreaCreateSchema = z.object({
  name: z.string().trim().min(2).max(255),
  description: optionalText(2000),
  color_hex: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .default("#2563EB"),
});

export const thrustAreaPatchSchema = thrustAreaCreateSchema.partial().extend({
  id: uuidSchema,
  is_active: z.boolean().optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email().trim().toLowerCase(),
  name: z.string().trim().min(2).max(255),
  role: roleSchema.default("employee"),
  department: z.string().trim().max(255).optional().nullable(),
  designation: z.string().trim().max(255).optional().nullable(),
  manager_id: uuidSchema.optional().nullable(),
  employee_code: z.string().trim().max(50).optional().nullable(),
  avatar_url: z.string().url().optional().nullable(),
});

export const userRolePatchSchema = z.object({
  role: roleSchema,
  reason: z.string().trim().min(10).max(1000).optional(),
});

export const escalationRuleCreateSchema = z.object({
  cycle_id: uuidSchema.optional().nullable(),
  trigger_event: z.string().trim().min(3).max(100),
  days_threshold: z.coerce.number().int().positive().max(365),
  notify_employee: z.boolean().optional().default(true),
  notify_manager: z.boolean().optional().default(true),
  notify_admin: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
});

export const escalationRulePatchSchema = escalationRuleCreateSchema.partial().extend({
  id: uuidSchema,
});

export const reminderSchema = z.object({
  sheet_ids: z.array(uuidSchema).min(1).max(100),
  message: optionalText(1000),
});
