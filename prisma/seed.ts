import { PrismaClient, Quarter, QuarterlyStatus, UomType } from "@prisma/client";
import { hash } from "bcryptjs";
import { computeProgressScore } from "../src/lib/scoring";

const prisma = new PrismaClient();

const thrustAreas = [
  { name: "Revenue Growth", colorHex: "#2563EB" },
  { name: "Customer Satisfaction", colorHex: "#0F766E" },
  { name: "Operational Excellence", colorHex: "#7C3AED" },
  { name: "People Development", colorHex: "#C2410C" },
  { name: "Innovation", colorHex: "#DB2777" },
  { name: "Cost Optimization", colorHex: "#16A34A" },
  { name: "Safety & Compliance", colorHex: "#DC2626" },
];

function date(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

function score(input: {
  uomType: UomType;
  targetValue?: number | null;
  actualValue?: number | null;
  targetDate?: Date | null;
  actualDate?: Date | null;
  actualZero?: boolean | null;
}) {
  return computeProgressScore(input);
}

async function main() {
  const passwordHash = await hash("AtomQuest@123", 12);

  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "audit_logs",
      "notifications",
      "escalation_rules",
      "checkin_comments",
      "quarterly_updates",
      "goals",
      "goal_sheets",
      "goal_cycles",
      "thrust_areas",
      "users"
    RESTART IDENTITY CASCADE;
  `);

  const admin = await prisma.user.create({
    data: {
      email: "admin@atomquest.com",
      name: "Admin HR",
      passwordHash,
      role: "admin",
      department: "Human Resources",
      designation: "HR Business Partner",
      employeeCode: "AQ-ADM-001",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@atomquest.com",
      name: "Rajesh Kumar",
      passwordHash,
      role: "manager",
      department: "Operations",
      designation: "L1 Manager",
      employeeCode: "AQ-MGR-001",
    },
  });

  const [priya, amit] = await Promise.all([
    prisma.user.create({
      data: {
        email: "emp1@atomquest.com",
        name: "Priya Sharma",
        passwordHash,
        role: "employee",
        department: "Operations",
        designation: "Senior Associate",
        employeeCode: "AQ-EMP-001",
        managerId: manager.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "emp2@atomquest.com",
        name: "Amit Verma",
        passwordHash,
        role: "employee",
        department: "Operations",
        designation: "Associate",
        employeeCode: "AQ-EMP-002",
        managerId: manager.id,
      },
    }),
  ]);

  const cycle = await prisma.goalCycle.create({
    data: {
      name: "FY 2025-26",
      goalSettingOpens: date("2025-05-01"),
      q1Opens: date("2025-07-01"),
      q2Opens: date("2025-10-01"),
      q3Opens: date("2026-01-01"),
      q4Opens: date("2026-03-01"),
      isActive: true,
      createdBy: admin.id,
    },
  });

  const createdThrustAreas = await Promise.all(
    thrustAreas.map((area) =>
      prisma.thrustArea.create({
        data: {
          ...area,
          createdBy: admin.id,
        },
      })
    )
  );

  const thrustByName = new Map(
    createdThrustAreas.map((area) => [area.name, area.id])
  );

  const now = new Date();

  const priyaSheet = await prisma.goalSheet.create({
    data: {
      employeeId: priya.id,
      cycleId: cycle.id,
      status: "locked",
      submittedAt: now,
      approvedAt: now,
      approvedBy: manager.id,
      lockedAt: now,
      totalWeightage: 100,
    },
  });

  const amitSheet = await prisma.goalSheet.create({
    data: {
      employeeId: amit.id,
      cycleId: cycle.id,
      status: "approved",
      submittedAt: now,
      approvedAt: now,
      approvedBy: manager.id,
      totalWeightage: 100,
    },
  });

  const revenueGoal = await prisma.goal.create({
    data: {
      sheetId: priyaSheet.id,
      thrustAreaId: thrustByName.get("Revenue Growth")!,
      title: "Grow enterprise renewal revenue",
      description: "Increase renewal revenue from managed accounts.",
      uomType: "min_numeric",
      targetValue: 1200000,
      weightage: 30,
      isLocked: true,
      displayOrder: 1,
    },
  });

  const csatGoal = await prisma.goal.create({
    data: {
      sheetId: priyaSheet.id,
      thrustAreaId: thrustByName.get("Customer Satisfaction")!,
      title: "Maintain customer satisfaction score",
      description: "Keep quarterly CSAT at or above target.",
      uomType: "min_percent",
      targetValue: 92,
      weightage: 25,
      isLocked: true,
      displayOrder: 2,
    },
  });

  const sharedParentGoal = await prisma.goal.create({
    data: {
      sheetId: priyaSheet.id,
      thrustAreaId: thrustByName.get("Operational Excellence")!,
      title: "Reduce average ticket turnaround time",
      description: "Department-level KPI shared across the operations team.",
      uomType: "max_numeric",
      targetValue: 24,
      weightage: 25,
      isShared: true,
      primaryOwnerId: priya.id,
      isLocked: true,
      displayOrder: 3,
    },
  });

  const safetyGoal = await prisma.goal.create({
    data: {
      sheetId: priyaSheet.id,
      thrustAreaId: thrustByName.get("Safety & Compliance")!,
      title: "Zero critical compliance incidents",
      description: "Avoid critical safety and compliance misses.",
      uomType: "zero",
      targetValue: 0,
      weightage: 20,
      isLocked: true,
      displayOrder: 4,
    },
  });

  const innovationGoal = await prisma.goal.create({
    data: {
      sheetId: amitSheet.id,
      thrustAreaId: thrustByName.get("Innovation")!,
      title: "Launch automation pilot",
      description: "Complete rollout of one internal automation pilot.",
      uomType: "timeline",
      targetDate: date("2026-03-15"),
      weightage: 30,
      isLocked: false,
      displayOrder: 1,
    },
  });

  const qualityGoal = await prisma.goal.create({
    data: {
      sheetId: amitSheet.id,
      thrustAreaId: thrustByName.get("Operational Excellence")!,
      title: "Improve first-pass resolution",
      description: "Raise first-pass resolution for assigned queues.",
      uomType: "min_percent",
      targetValue: 88,
      weightage: 25,
      isLocked: false,
      displayOrder: 2,
    },
  });

  const sharedChildGoal = await prisma.goal.create({
    data: {
      sheetId: amitSheet.id,
      thrustAreaId: thrustByName.get("Operational Excellence")!,
      title: "Reduce average ticket turnaround time",
      description: "Read-only shared KPI; achievement follows the primary owner.",
      uomType: "max_numeric",
      targetValue: 24,
      weightage: 25,
      isShared: true,
      sharedFromGoalId: sharedParentGoal.id,
      primaryOwnerId: priya.id,
      isLocked: false,
      displayOrder: 3,
    },
  });

  const peopleGoal = await prisma.goal.create({
    data: {
      sheetId: amitSheet.id,
      thrustAreaId: thrustByName.get("People Development")!,
      title: "Complete skill development plan",
      description: "Finish assigned quarterly learning modules.",
      uomType: "min_percent",
      targetValue: 100,
      weightage: 20,
      isLocked: false,
      displayOrder: 4,
    },
  });

  await prisma.quarterlyUpdate.createMany({
    data: [
      {
        goalId: revenueGoal.id,
        quarter: Quarter.Q1,
        actualValue: 320000,
        status: QuarterlyStatus.on_track,
        computedScore: score({
          uomType: "min_numeric",
          targetValue: 1200000,
          actualValue: 320000,
        }),
        employeeNotes: "Renewal pipeline is pacing ahead for Q1.",
      },
      {
        goalId: csatGoal.id,
        quarter: Quarter.Q1,
        actualValue: 94,
        status: QuarterlyStatus.completed,
        computedScore: score({
          uomType: "min_percent",
          targetValue: 92,
          actualValue: 94,
        }),
        employeeNotes: "CSAT improved after faster escalation routing.",
      },
      {
        goalId: sharedParentGoal.id,
        quarter: Quarter.Q1,
        actualValue: 22,
        status: QuarterlyStatus.completed,
        computedScore: score({
          uomType: "max_numeric",
          targetValue: 24,
          actualValue: 22,
        }),
        employeeNotes: "Shared KPI source update from primary owner.",
      },
      {
        goalId: sharedChildGoal.id,
        quarter: Quarter.Q1,
        actualValue: 22,
        status: QuarterlyStatus.completed,
        computedScore: score({
          uomType: "max_numeric",
          targetValue: 24,
          actualValue: 22,
        }),
        employeeNotes: "Synced from Priya Sharma's primary shared KPI.",
      },
      {
        goalId: safetyGoal.id,
        quarter: Quarter.Q1,
        actualValue: 0,
        actualZero: true,
        status: QuarterlyStatus.completed,
        computedScore: score({
          uomType: "zero",
          actualValue: 0,
          actualZero: true,
        }),
        employeeNotes: "No critical incidents reported.",
      },
      {
        goalId: innovationGoal.id,
        quarter: Quarter.Q1,
        actualDate: date("2026-03-18"),
        status: QuarterlyStatus.on_track,
        computedScore: score({
          uomType: "timeline",
          targetDate: date("2026-03-15"),
          actualDate: date("2026-03-18"),
        }),
        employeeNotes: "Pilot scope finalized; rollout dependency remains.",
      },
      {
        goalId: qualityGoal.id,
        quarter: Quarter.Q1,
        actualValue: 81,
        status: QuarterlyStatus.on_track,
        computedScore: score({
          uomType: "min_percent",
          targetValue: 88,
          actualValue: 81,
        }),
        employeeNotes: "Queue coaching started in week four.",
      },
      {
        goalId: peopleGoal.id,
        quarter: Quarter.Q1,
        actualValue: 35,
        status: QuarterlyStatus.on_track,
        computedScore: score({
          uomType: "min_percent",
          targetValue: 100,
          actualValue: 35,
        }),
        employeeNotes: "Two of six learning modules completed.",
      },
    ],
  });

  await prisma.checkinComment.create({
    data: {
      sheetId: priyaSheet.id,
      managerId: manager.id,
      quarter: Quarter.Q1,
      overallComment:
        "Strong start to the cycle with visible ownership on shared operations KPI.",
      keyObservations:
        "Revenue and CSAT are ahead of plan; shared TAT is already under target.",
      areasOfImprovement:
        "Document reusable playbooks for the turnaround-time improvement.",
      supportRequired: "Support from analytics team for weekly KPI slicing.",
    },
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientId: manager.id,
        type: "goal_submitted",
        title: "Priya Sharma submitted goals",
        body: "Goal sheet is ready for manager review.",
        entityType: "goal_sheet",
        entityId: priyaSheet.id,
      },
      {
        recipientId: amit.id,
        type: "shared_goal_received",
        title: "Shared KPI added to your sheet",
        body: "Reduce average ticket turnaround time was pushed by your manager.",
        entityType: "goal",
        entityId: sharedChildGoal.id,
      },
    ],
  });

  await prisma.escalationRule.createMany({
    data: [
      {
        cycleId: cycle.id,
        triggerEvent: "goal_not_submitted",
        daysThreshold: 7,
        notifyEmployee: true,
        notifyManager: true,
        notifyAdmin: false,
      },
      {
        cycleId: cycle.id,
        triggerEvent: "checkin_overdue",
        daysThreshold: 5,
        notifyEmployee: false,
        notifyManager: true,
        notifyAdmin: true,
      },
    ],
  });

  await prisma.auditLog.create({
    data: {
      entityType: "goal_sheet",
      entityId: priyaSheet.id,
      action: "status_changed",
      changedBy: manager.id,
      changedByRole: "manager",
      previousValue: { status: "approved" },
      newValue: { status: "locked", lockedAt: now.toISOString() },
      reason: "Manager approved and locked the FY 2025-26 goal sheet.",
    },
  });

  console.log("Seeded AtomQuest demo database");
  console.log("Demo password for all users: AtomQuest@123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
