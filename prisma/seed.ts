import { PrismaClient, Quarter, QuarterlyStatus, UomType } from "@prisma/client";
import { computeProgressScore } from "../src/lib/scoring";

const prisma = new PrismaClient();

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
      name: "Ananya Krishnan",
      email: "admin@atomquest.com",
      role: "admin",
      department: "Human Resources",
      designation: "HR Manager",
      employeeCode: "EMP-001",
    },
  });

  const rajesh = await prisma.user.create({
    data: {
      name: "Rajesh Kumar",
      email: "manager@atomquest.com",
      role: "manager",
      department: "Operations",
      designation: "Operations Manager",
      employeeCode: "EMP-002",
    },
  });

  const sunita = await prisma.user.create({
    data: {
      name: "Sunita Mehta",
      email: "manager2@atomquest.com",
      role: "manager",
      department: "Sales",
      designation: "Sales Manager",
      employeeCode: "EMP-003",
    },
  });

  const [priya, amit, neha, arjun] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Priya Sharma",
        email: "emp1@atomquest.com",
        role: "employee",
        department: "Operations",
        designation: "Operations Analyst",
        employeeCode: "EMP-004",
        managerId: rajesh.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Amit Verma",
        email: "emp2@atomquest.com",
        role: "employee",
        department: "Operations",
        designation: "Process Coordinator",
        employeeCode: "EMP-005",
        managerId: rajesh.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Neha Iyer",
        email: "emp3@atomquest.com",
        role: "employee",
        department: "Sales",
        designation: "Sales Executive",
        employeeCode: "EMP-006",
        managerId: sunita.id,
      },
    }),
    prisma.user.create({
      data: {
        name: "Arjun Patel",
        email: "emp4@atomquest.com",
        role: "employee",
        department: "Sales",
        designation: "Key Account Manager",
        employeeCode: "EMP-007",
        managerId: sunita.id,
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

  const thrustAreas = await Promise.all(
    [
      ["Revenue Growth", "#22C55E"],
      ["Customer Satisfaction", "#3B82F6"],
      ["Operational Excellence", "#F59E0B"],
      ["People Development", "#8B5CF6"],
      ["Innovation", "#EC4899"],
      ["Cost Optimization", "#14B8A6"],
      ["Safety & Compliance", "#EF4444"],
    ].map(([name, colorHex]) =>
      prisma.thrustArea.create({
        data: {
          name,
          colorHex,
          createdBy: admin.id,
        },
      })
    )
  );

  const thrust = new Map(thrustAreas.map((area) => [area.name, area.id]));

  const priyaSheet = await prisma.goalSheet.create({
    data: {
      employeeId: priya.id,
      cycleId: cycle.id,
      status: "locked",
      submittedAt: date("2025-05-20"),
      approvedAt: date("2025-05-27"),
      approvedBy: rajesh.id,
      lockedAt: date("2025-05-27"),
      totalWeightage: 100,
    },
  });

  const amitSheet = await prisma.goalSheet.create({
    data: {
      employeeId: amit.id,
      cycleId: cycle.id,
      status: "submitted",
      submittedAt: date("2025-05-29"),
      totalWeightage: 100,
    },
  });

  const nehaSheet = await prisma.goalSheet.create({
    data: {
      employeeId: neha.id,
      cycleId: cycle.id,
      status: "returned",
      submittedAt: date("2025-05-24"),
      managerRemarks:
        "Revenue goal target seems too conservative. Please revise to 15% growth minimum.",
      totalWeightage: 75,
    },
  });

  const arjunSheet = await prisma.goalSheet.create({
    data: {
      employeeId: arjun.id,
      cycleId: cycle.id,
      status: "draft",
      totalWeightage: 60,
    },
  });

  const priyaGoals = await Promise.all([
    prisma.goal.create({
      data: {
        sheetId: priyaSheet.id,
        thrustAreaId: thrust.get("Operational Excellence")!,
        title: "Increase quarterly process audit completion rate",
        description: "Lift completion of scheduled process audits across operations pods.",
        uomType: "min_percent",
        targetValue: 95,
        weightage: 30,
        isLocked: true,
        displayOrder: 1,
      },
    }),
    prisma.goal.create({
      data: {
        sheetId: priyaSheet.id,
        thrustAreaId: thrust.get("Customer Satisfaction")!,
        title: "Reduce average ticket resolution TAT below 24 hours",
        description: "Improve queue handling and escalation hygiene to reduce average TAT.",
        uomType: "max_numeric",
        targetValue: 24,
        weightage: 25,
        isLocked: true,
        displayOrder: 2,
      },
    }),
    prisma.goal.create({
      data: {
        sheetId: priyaSheet.id,
        thrustAreaId: thrust.get("Safety & Compliance")!,
        title: "Complete all mandatory compliance trainings",
        description: "Complete assigned mandatory trainings with zero compliance misses.",
        uomType: "zero",
        targetValue: 0,
        weightage: 20,
        isLocked: true,
        displayOrder: 3,
      },
    }),
    prisma.goal.create({
      data: {
        sheetId: priyaSheet.id,
        thrustAreaId: thrust.get("People Development")!,
        title: "Mentor 2 junior team members through onboarding",
        description: "Support new team members through structured onboarding rituals.",
        uomType: "min_numeric",
        targetValue: 2,
        weightage: 15,
        isLocked: true,
        displayOrder: 4,
      },
    }),
    prisma.goal.create({
      data: {
        sheetId: priyaSheet.id,
        thrustAreaId: thrust.get("Innovation")!,
        title: "Submit process improvement suggestion accepted by management",
        description: "Identify and submit one accepted improvement suggestion.",
        uomType: "min_numeric",
        targetValue: 1,
        weightage: 10,
        isLocked: true,
        displayOrder: 5,
      },
    }),
  ]);

  await prisma.quarterlyUpdate.createMany({
    data: [
      [priyaGoals[0], Quarter.Q1, 88, null, QuarterlyStatus.on_track],
      [priyaGoals[0], Quarter.Q2, 92, null, QuarterlyStatus.on_track],
      [priyaGoals[1], Quarter.Q1, 26, null, QuarterlyStatus.on_track],
      [priyaGoals[1], Quarter.Q2, 21, null, QuarterlyStatus.completed],
      [priyaGoals[2], Quarter.Q1, 0, true, QuarterlyStatus.completed],
      [priyaGoals[2], Quarter.Q2, 0, true, QuarterlyStatus.completed],
      [priyaGoals[3], Quarter.Q1, 1, null, QuarterlyStatus.on_track],
      [priyaGoals[3], Quarter.Q2, 2, null, QuarterlyStatus.completed],
      [priyaGoals[4], Quarter.Q1, 0, null, QuarterlyStatus.not_started],
      [priyaGoals[4], Quarter.Q2, 1, null, QuarterlyStatus.completed],
    ].map(([goal, quarter, actualValue, actualZero, status]) => ({
      goalId: (goal as typeof priyaGoals[number]).id,
      quarter: quarter as Quarter,
      actualValue: actualValue as number,
      actualZero: actualZero as boolean | null,
      status: status as QuarterlyStatus,
      computedScore: score({
        uomType: (goal as typeof priyaGoals[number]).uomType,
        targetValue: (goal as typeof priyaGoals[number]).targetValue?.toNumber() ?? null,
        actualValue: actualValue as number,
        actualZero: actualZero as boolean | null,
      }),
      employeeNotes: `${quarter} update recorded for demo data.`,
    })),
  });

  await prisma.checkinComment.createMany({
    data: [
      {
        sheetId: priyaSheet.id,
        managerId: rajesh.id,
        quarter: "Q1",
        overallComment:
          "Priya is doing well. TAT improvement is the standout achievement this quarter.",
        keyObservations: "Strong compliance adherence. Mentoring goal needs acceleration.",
        areasOfImprovement: "Process suggestion goal not started - needs a plan.",
        supportRequired: "None at this stage - Priya is self-sufficient.",
        checkinDate: date("2025-07-20"),
      },
      {
        sheetId: priyaSheet.id,
        managerId: rajesh.id,
        quarter: "Q2",
        overallComment:
          "Priya closed the improvement suggestion and has strong progress across all goals.",
        keyObservations: "TAT and mentoring targets are now ahead of plan.",
        areasOfImprovement: "Keep audit completion moving toward the 95% target.",
        supportRequired: "No additional support required.",
        checkinDate: date("2025-10-18"),
      },
    ],
  });

  await prisma.goal.createMany({
    data: [
      {
        sheetId: amitSheet.id,
        thrustAreaId: thrust.get("Operational Excellence")!,
        title: "Process documentation coverage for all critical workflows",
        description: "Document all critical workflows and review them with stakeholders.",
        uomType: "min_percent",
        targetValue: 100,
        weightage: 35,
        displayOrder: 1,
      },
      {
        sheetId: amitSheet.id,
        thrustAreaId: thrust.get("Customer Satisfaction")!,
        title: "Achieve 4.2+ satisfaction score on internal support surveys",
        description: "Improve internal support quality through faster first response.",
        uomType: "min_numeric",
        targetValue: 4.2,
        weightage: 30,
        displayOrder: 2,
      },
      {
        sheetId: amitSheet.id,
        thrustAreaId: thrust.get("Safety & Compliance")!,
        title: "Zero safety violations for FY 2025-26",
        description: "Maintain clean safety and compliance adherence.",
        uomType: "zero",
        targetValue: 0,
        weightage: 20,
        displayOrder: 3,
      },
      {
        sheetId: amitSheet.id,
        thrustAreaId: thrust.get("People Development")!,
        title: "Complete Advanced Excel certification",
        description: "Complete certification before the September deadline.",
        uomType: "timeline",
        targetDate: date("2025-09-30"),
        weightage: 15,
        displayOrder: 4,
      },
      {
        sheetId: nehaSheet.id,
        thrustAreaId: thrust.get("Revenue Growth")!,
        title: "Grow qualified sales pipeline by at least 12 percent",
        description: "Returned for target revision to at least 15 percent growth.",
        uomType: "min_percent",
        targetValue: 12,
        weightage: 30,
        displayOrder: 1,
      },
      {
        sheetId: nehaSheet.id,
        thrustAreaId: thrust.get("Customer Satisfaction")!,
        title: "Improve customer follow-up SLA adherence",
        description: "Maintain consistent follow-up within committed timelines.",
        uomType: "min_percent",
        targetValue: 90,
        weightage: 25,
        displayOrder: 2,
      },
      {
        sheetId: nehaSheet.id,
        thrustAreaId: thrust.get("Innovation")!,
        title: "Pilot one account expansion playbook",
        description: "Test a repeatable playbook for strategic accounts.",
        uomType: "min_numeric",
        targetValue: 1,
        weightage: 20,
        displayOrder: 3,
      },
      {
        sheetId: arjunSheet.id,
        thrustAreaId: thrust.get("Revenue Growth")!,
        title: "Expand revenue from top five key accounts",
        description: "Build expansion plans for the highest potential accounts.",
        uomType: "min_percent",
        targetValue: 18,
        weightage: 35,
        displayOrder: 1,
      },
      {
        sheetId: arjunSheet.id,
        thrustAreaId: thrust.get("Cost Optimization")!,
        title: "Reduce discount leakage on renewal opportunities",
        description: "Improve pricing discipline on key renewal opportunities.",
        uomType: "max_percent",
        targetValue: 8,
        weightage: 25,
        displayOrder: 2,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        entityType: "goal",
        entityId: priyaGoals[4].id,
        action: "goal_unlocked",
        changedBy: admin.id,
        changedByRole: "admin",
        previousValue: { isLocked: true, uomType: "min_percent" },
        newValue: { isLocked: false, uomType: "min_numeric" },
        reason:
          "Employee clarified the metric - adjusted from min_percent to min_numeric as advised by finance team.",
        createdAt: date("2025-06-15"),
      },
      {
        entityType: "user",
        entityId: arjun.id,
        action: "login_success",
        changedBy: arjun.id,
        changedByRole: "employee",
        previousValue: { role: "employee" },
        newValue: { role: "employee" },
        reason: "Demo login audit entry for unchanged employee role.",
        createdAt: date("2025-06-18"),
      },
      {
        entityType: "goal_sheet",
        entityId: nehaSheet.id,
        action: "goal_returned",
        changedBy: rajesh.id,
        changedByRole: "manager",
        previousValue: { status: "submitted" },
        newValue: { status: "returned" },
        reason: "Revenue target too conservative.",
        createdAt: date("2025-05-28"),
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        recipientId: priya.id,
        type: "goal_approved",
        title: "Your goal sheet has been approved and locked",
        isRead: true,
        entityType: "goal_sheet",
        entityId: priyaSheet.id,
      },
      {
        recipientId: priya.id,
        type: "checkin_comment_added",
        title: "Rajesh Kumar completed Q1 check-in on your goals",
        isRead: false,
        entityType: "goal_sheet",
        entityId: priyaSheet.id,
      },
      {
        recipientId: amit.id,
        type: "goal_submitted",
        title: "Your goal sheet has been submitted to Rajesh Kumar for approval",
        isRead: true,
        entityType: "goal_sheet",
        entityId: amitSheet.id,
      },
      {
        recipientId: amit.id,
        type: "reminder",
        title: "Rajesh Kumar has not yet reviewed your submission. Reminder sent.",
        isRead: false,
        entityType: "goal_sheet",
        entityId: amitSheet.id,
      },
      {
        recipientId: neha.id,
        type: "goal_returned",
        title: "Your goal sheet was returned for rework. Reason: Revenue target too conservative.",
        isRead: false,
        entityType: "goal_sheet",
        entityId: nehaSheet.id,
      },
      {
        recipientId: rajesh.id,
        type: "goal_submitted",
        title: "Amit Verma submitted their goal sheet for your approval",
        isRead: false,
        entityType: "goal_sheet",
        entityId: amitSheet.id,
      },
      {
        recipientId: rajesh.id,
        type: "goal_resubmitted",
        title: "Neha Iyer has resubmitted their goal sheet",
        isRead: true,
        entityType: "goal_sheet",
        entityId: nehaSheet.id,
      },
    ],
  });

  await prisma.escalationRule.createMany({
    data: [
      {
        cycleId: cycle.id,
        triggerEvent: "goal_not_submitted",
        daysThreshold: 7,
      },
      {
        cycleId: cycle.id,
        triggerEvent: "checkin_overdue",
        daysThreshold: 5,
        notifyAdmin: true,
      },
    ],
  });

  console.log("Seeded Nexus Corp demo data for AtomQuest");
  console.log("Authentication is disabled; open /dashboard to use the workspace.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
