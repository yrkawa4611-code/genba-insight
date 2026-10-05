import { calendarSchema } from "./calendar.js";
import { calculateDisposal, disposalFields, emptyDisposal, isDisposal } from "./disposal.js";
import { calculateCost, laborCountSchema, laborUnitPriceSchema } from "./labor.js";
import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono, type Context, type Next } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "./generated/prisma/client.js";
import bcrypt from "bcryptjs";
import { jwt, sign, type JwtVariables } from "hono/jwt";

const connectionString = process.env.DATABASE_URL;

const jwtSecret = process.env.JWT_SECRET;

if (!connectionString) {
  throw new Error("DATABASE_URLが設定されていません");
}

if (!jwtSecret) {
  throw new Error("JWT_SECRETが設定されていません");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type AuthenticatedCompany = {
  id: number;
  code: string;
  name: string;
};

type AppEnv = {
  Variables: JwtVariables & {
    authenticatedCompany: AuthenticatedCompany;
  };
};

const app = new Hono<AppEnv>();

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

const loginSchema = z.object({
  companyCode: z.string().trim().min(1).max(50),

  password: z.string().min(8).max(72),
});

const scheduleDate = z.iso.date().transform((value) => new Date(value + "T00:00:00.000Z"));
const optionalScheduleDate = scheduleDate.nullish().transform((value) => value ?? null);
const todayJapan = () => new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo" }).format(new Date());

const createProjectSchema = z.object({
  hasAdditionalWork: z.boolean().nullish(),
  laborUnitPrice: laborUnitPriceSchema.nullish().transform((value) => value ?? null),
  targetProfitMargin: z.number().int().min(0).max(100).nullish().transform((value) => value ?? null),
  name: z.string().trim().nullish().transform((value) => value || null),
  address: z.string().trim().min(1),
  structure: z.string().trim().min(1),
  areaTsubo: z.number().positive(),
  contractPrice: z.number().int().min(0),
  startDate: scheduleDate,
  plannedEndDate: optionalScheduleDate,
  completedDate: optionalScheduleDate,
}).superRefine((input, ctx) => {
  for (const field of ["plannedEndDate", "completedDate"] as const) {
    if (input[field] && input[field] < input.startDate) ctx.addIssue({ code: "custom", path: [field], message: "着工日より前の日付は登録できません" });
  }
  if (input.completedDate && input.completedDate.toISOString().slice(0, 10) > todayJapan()) ctx.addIssue({ code: "custom", path: ["completedDate"], message: "完工日に未来の日付は登録できません" });
});

const createCostEntrySchema = z.object({
  category: z.enum([
    "DISPOSAL",
    "LABOR",
    "VEHICLE",
    "MACHINERY",
    "ATTACHMENT",
    "LEASE",
    "SUBCONTRACT",
    "MISC",
  ]),
  detail: z.string().trim().max(100).optional(),
  amount: z.number().int().positive().optional(),
  laborCount: laborCountSchema.nullish(),
  disposalQuantity: disposalFields.disposalQuantity.nullish(),
  disposalUnit: disposalFields.disposalUnit.nullish(),
  disposalUnitPrice: disposalFields.disposalUnitPrice.nullish(),
  disposalTaxRate: disposalFields.disposalTaxRate.nullish(),
  occurredAt: z.string().trim().min(1).pipe(z.coerce.date()),
  memo: z.string().trim().max(200).optional(),
});

const updateCostEntrySchema = z.object({
  category: z.enum([
    "DISPOSAL",
    "LABOR",
    "VEHICLE",
    "MACHINERY",
    "ATTACHMENT",
    "LEASE",
    "SUBCONTRACT",
    "MISC",
  ]),
  detail: z.string().trim().max(100).nullable(),
  amount: z.number().int().positive().optional(),
  laborCount: laborCountSchema.nullish(),
  disposalQuantity: disposalFields.disposalQuantity.nullish(),
  disposalUnit: disposalFields.disposalUnit.nullish(),
  disposalUnitPrice: disposalFields.disposalUnitPrice.nullish(),
  disposalTaxRate: disposalFields.disposalTaxRate.nullish(),
  occurredAt: z.string().trim().min(1).pipe(z.coerce.date()),
  memo: z.string().trim().max(200).nullable(),
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.post("/auth/login", zValidator("json", loginSchema), async (c) => {
  const { companyCode, password } = c.req.valid("json");

  const company = await prisma.company.findUnique({
    where: {
      code: companyCode,
    },
  });

  if (!company) {
    return c.json(
      {
        message: "会社IDまたはパスワードが違います",
      },
      401,
    );
  }

  const passwordMatches = await bcrypt.compare(password, company.passwordHash);

  if (!passwordMatches) {
    return c.json(
      {
        message: "会社IDまたはパスワードが違います",
      },
      401,
    );
  }

  const issuedAt = Math.floor(Date.now() / 1000);

  const token = await sign(
    {
      sub: company.id.toString(),
      companyCode: company.code,
      companyName: company.name,
      iat: issuedAt,
      exp: issuedAt + 60 * 60 * 8,
    },
    jwtSecret,
    "HS256",
  );

  return c.json({
    token,
    company: {
      id: company.id,
      code: company.code,
      name: company.name,
    },
  });
});

const requireAuth = jwt({
  secret: jwtSecret,
  alg: "HS256",
});

const getAuthenticatedCompany = async (c: Context<AppEnv>) => {
  const payload = c.get("jwtPayload");

  if (typeof payload.sub !== "string") {
    return null;
  }

  const companyId = Number(payload.sub);

  if (!Number.isSafeInteger(companyId) || companyId <= 0) {
    return null;
  }

  return prisma.company.findUnique({
    where: {
      id: companyId,
    },
    select: {
      id: true,
      code: true,
      name: true,
    },
  });
};

const requireAuthenticatedCompany = async (c: Context<AppEnv>, next: Next) => {
  const company = await getAuthenticatedCompany(c);

  if (!company) {
    return c.json({ message: "認証情報が正しくありません" }, 401);
  }

  c.set("authenticatedCompany", company);

  await next();
};

app.use("/auth/me", requireAuth);
app.use("/auth/me", requireAuthenticatedCompany);

app.get("/auth/me", (c) => {
  const company = c.get("authenticatedCompany");

  return c.json({
    company,
  });
});

app.use("/calendar", requireAuth);
app.use("/calendar/*", requireAuth);
app.use("/calendar", requireAuthenticatedCompany);
app.use("/calendar/*", requireAuthenticatedCompany);
app.use("/projects", requireAuth);
app.use("/projects/*", requireAuth);
app.use("/projects", requireAuthenticatedCompany);
app.use("/projects/*", requireAuthenticatedCompany);

app.use("/costs", requireAuth);
app.use("/costs", requireAuthenticatedCompany);

app.get("/costs", async (c) => {
  const company = c.get("authenticatedCompany");

  const costs = await prisma.costEntry.findMany({
    where: {
      project: {
        is: {
          companyId: company.id,
        },
      },
    },
    select: {
      id: true,
      category: true,
      detail: true,
      amount: true,
      occurredAt: true,
      memo: true,
      disposalQuantity: true,
      disposalUnit: true,
      disposalUnitPrice: true,
      disposalTaxRate: true,
      disposalSubtotal: true,
      disposalTaxAmount: true,
      laborCount: true,
      laborUnitPrice: true,
      project: {
        select: {
          id: true,
          address: true,
          name: true,
        },
      },
    },
    orderBy: [
      { occurredAt: "desc" },
      { id: "desc" },
    ],
  });

  return c.json(costs.map((entry) => ({ ...entry, laborCount: entry.laborCount?.toNumber() ?? null, disposalQuantity: entry.disposalQuantity?.toNumber() ?? null, disposalTaxRate: entry.disposalTaxRate?.toNumber() ?? null })));
});

const isMetalSale = (entry: { category: string; detail: string | null }) =>
  entry.category === "DISPOSAL" && entry.detail === "金属";

const summarizeCosts = (entries: { category: string; detail: string | null; amount: number }[]) =>
  entries.reduce(
    (totals, entry) => {
      if (isMetalSale(entry)) {
        totals.saleIncome += entry.amount;
      } else {
        totals.cost += entry.amount;
      }
      return totals;
    },
    { cost: 0, saleIncome: 0 },
  );


app.get("/calendar", async c => {
  return c.json(await prisma.calendarEntry.findMany({ where: { companyId: c.get("authenticatedCompany").id }, orderBy: { startDate: "asc" } }));
});

const calendarConflictMessage = "この現場には既に予定が紐づいています。既存の予定を編集してください。";
const handleCalendarConflict = (error: unknown) => {
  if (error && typeof error === "object" && "code" in error && error.code === "P2002") return null;
  throw error;
};

app.post("/calendar", zValidator("json", calendarSchema), async c => {
  const companyId = c.get("authenticatedCompany").id;
  const input = c.req.valid("json");
  const project = input.projectId ? await prisma.project.findFirst({ where: { id: input.projectId, companyId } }) : null;
  if (input.projectId && !project) return c.json({ message: "現場が見つかりません" }, 404);
  if (project && await prisma.calendarEntry.findFirst({ where: { projectId: project.id } })) return c.json({ message: calendarConflictMessage }, 409);
  if (project?.completedDate && input.startDate > project.completedDate) return c.json({ message: "着工日を実際の完工日より後にはできません" }, 400);
  const entry = await prisma.$transaction(async tx => {
    if (project) await tx.project.update({ where: { id: project.id }, data: { startDate: input.startDate, plannedEndDate: input.plannedEndDate, originalPlannedEndDate: project.originalPlannedEndDate ?? input.plannedEndDate } });
    return tx.calendarEntry.create({ data: { ...input, companyId } });
  }).catch(handleCalendarConflict);
  if (!entry) return c.json({ message: calendarConflictMessage }, 409);
  return c.json(entry, 201);
});

app.put("/calendar/:id", zValidator("json", calendarSchema), async c => {
  const companyId = c.get("authenticatedCompany").id;
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ message: "予定IDが正しくありません" }, 400);
  const entry = await prisma.calendarEntry.findFirst({ where: { id, companyId } });
  if (!entry) return c.json({ message: "予定が見つかりません" }, 404);
  const input = c.req.valid("json");
  const project = input.projectId ? await prisma.project.findFirst({ where: { id: input.projectId, companyId } }) : null;
  if (input.projectId && !project) return c.json({ message: "現場が見つかりません" }, 404);
  if (project && await prisma.calendarEntry.findFirst({ where: { projectId: project.id, id: { not: id } } })) return c.json({ message: calendarConflictMessage }, 409);
  if (project?.completedDate && input.startDate > project.completedDate) return c.json({ message: "着工日を実際の完工日より後にはできません" }, 400);
  const updated = await prisma.$transaction(async tx => {
    if (project) await tx.project.update({ where: { id: project.id }, data: { startDate: input.startDate, plannedEndDate: input.plannedEndDate, originalPlannedEndDate: project.originalPlannedEndDate ?? input.plannedEndDate } });
    return tx.calendarEntry.update({ where: { id }, data: input });
  }).catch(handleCalendarConflict);
  if (!updated) return c.json({ message: calendarConflictMessage }, 409);
  return c.json(updated);
});

app.post("/calendar/:id/register", zValidator("json", createProjectSchema), async c => {
  const companyId = c.get("authenticatedCompany").id;
  const id = Number(c.req.param("id"));
  if (!Number.isSafeInteger(id) || id <= 0) return c.json({ message: "予定IDが正しくありません" }, 400);
  const entry = await prisma.calendarEntry.findFirst({ where: { id, companyId } });
  if (!entry) return c.json({ message: "予定が見つかりません" }, 404);
  if (entry.projectId) return c.json({ message: "この予定は現場登録済みです" }, 409);
  const input = c.req.valid("json");
  const project = await prisma.$transaction(async tx => {
    // Claim the entry before creating a project, preventing duplicate registrations.
    const claim = await tx.calendarEntry.updateMany({ where: { id, companyId, projectId: null }, data: { updatedAt: new Date() } });
    if (!claim.count) return null;
    const created = await tx.project.create({ data: { ...input, companyId, originalPlannedEndDate: input.plannedEndDate } });
    await tx.calendarEntry.update({ where: { id }, data: { projectId: created.id, startDate: input.startDate, plannedEndDate: input.plannedEndDate } });
    return created;
  });
  if (!project) return c.json({ message: "この予定は現場登録済みです" }, 409);
  return c.json({ ...project, cost: 0, saleIncome: 0 }, 201);
});

app.get("/projects", async (c) => {
  const company = c.get("authenticatedCompany");

  const projects = await prisma.project.findMany({
    where: {
      companyId: company.id,
    },
    include: {
      costs: {
        select: {
          amount: true,
          category: true,
          detail: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const projectsWithCost = projects.map(({ costs, ...project }) => ({
    ...project,
    targetProfitMargin: project.targetProfitMargin,
    ...summarizeCosts(costs),
  }));

  return c.json(projectsWithCost);
});

app.get("/projects/:id", async (c) => {
  const company = c.get("authenticatedCompany");

  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: company.id,
    },
    include: {
      costs: {
        orderBy: {
          occurredAt: "desc",
        },
      },
    },
  });

  if (!project) {
    return c.json({ message: "現場が見つかりません" }, 404);
  }

  const totals = summarizeCosts(project.costs);

  return c.json({
    ...project,
    costs: project.costs.map((entry) => ({ ...entry, laborCount: entry.laborCount?.toNumber() ?? null, disposalQuantity: entry.disposalQuantity?.toNumber() ?? null, disposalTaxRate: entry.disposalTaxRate?.toNumber() ?? null })),
    targetProfitMargin: project.targetProfitMargin,
    ...totals,
  });
});

app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const company = c.get("authenticatedCompany");

  const project = await prisma.project.create({
    data: {
      ...c.req.valid("json"),
      companyId: company.id,
      originalPlannedEndDate: c.req.valid("json").plannedEndDate,
    },
  });

  return c.json(
    {
      ...project,
      targetProfitMargin: project.targetProfitMargin,
      cost: 0,
      saleIncome: 0,
    },
    201,
  );
});

app.put("/projects/:id", zValidator("json", createProjectSchema), async (c) => {
  const company = c.get("authenticatedCompany");

  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: company.id,
    },
    select: {
      id: true,
      originalPlannedEndDate: true,
    },
  });

  if (!existingProject) {
    return c.json({ message: "現場が見つかりません" }, 404);
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: { ...c.req.valid("json"), originalPlannedEndDate: existingProject.originalPlannedEndDate ?? c.req.valid("json").plannedEndDate },
    include: {
      costs: {
        select: {
          amount: true,
          category: true,
          detail: true,
        },
      },
    },
  });

  const { costs, ...project } = updatedProject;

  const totals = summarizeCosts(costs);

  return c.json({
    ...project,
    targetProfitMargin: project.targetProfitMargin,
    ...totals,
  });
});

app.delete("/projects/:id", async (c) => {
  const company = c.get("authenticatedCompany");

  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const existingProject = await prisma.project.findFirst({
    where: {
      id: projectId,
      companyId: company.id,
    },
    select: {
      id: true,
    },
  });

  if (!existingProject) {
    return c.json({ message: "現場が見つかりません" }, 404);
  }

  await prisma.project.delete({
    where: {
      id: projectId,
    },
  });

  return c.body(null, 204);
});

app.post(
  "/projects/:id/costs",
  zValidator("json", createCostEntrySchema),
  async (c) => {
    const company = c.get("authenticatedCompany");

    const projectId = Number(c.req.param("id"));

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return c.json({ message: "現場IDが正しくありません" }, 400);
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        companyId: company.id,
      },
      select: {
        id: true,
        laborUnitPrice: true,
      },
    });

    if (!project) {
      return c.json({ message: "現場が見つかりません" }, 404);
    }

    let calculated;
    try {
      const input = c.req.valid("json");
      calculated = isDisposal(input)
        ? { ...calculateDisposal(input), laborCount: null, laborUnitPrice: null }
        : { ...calculateCost(input, project.laborUnitPrice), ...emptyDisposal };
    } catch {
      return c.json({ message: "数量・単位・単価・税率・人数・金額を確認してください。人工単価未設定の場合は現場編集で設定してください。" }, 400);
    }

    const costEntry = await prisma.costEntry.create({
      data: {
        projectId,
        ...c.req.valid("json"),
        ...calculated,
      },
    });

    return c.json({ ...costEntry, laborCount: costEntry.laborCount?.toNumber() ?? null, disposalQuantity: costEntry.disposalQuantity?.toNumber() ?? null, disposalTaxRate: costEntry.disposalTaxRate?.toNumber() ?? null }, 201);
  },
);

app.put(
  "/projects/:projectId/costs/:costId",
  zValidator("json", updateCostEntrySchema),
  async (c) => {
    const company = c.get("authenticatedCompany");

    const projectId = Number(c.req.param("projectId"));

    const costId = Number(c.req.param("costId"));

    if (
      !Number.isInteger(projectId) ||
      projectId <= 0 ||
      !Number.isInteger(costId) ||
      costId <= 0
    ) {
      return c.json({ message: "IDが正しくありません" }, 400);
    }

    const existingCostEntry = await prisma.costEntry.findFirst({
      where: {
        id: costId,
        projectId,
        project: {
          is: {
            companyId: company.id,
          },
        },
      },
      select: {
        id: true,
        category: true,
        detail: true,
        disposalQuantity: true,
        disposalUnit: true,
        disposalUnitPrice: true,
        disposalTaxRate: true,
        disposalSubtotal: true,
        disposalTaxAmount: true,
        laborCount: true,
        laborUnitPrice: true,
        project: { select: { laborUnitPrice: true } },
      },
    });

    if (!existingCostEntry) {
      return c.json({ message: "工事原価が見つかりません" }, 404);
    }

    let calculated;
    try {
      const input = c.req.valid("json");
      const legacyDisposal = isDisposal(existingCostEntry) && existingCostEntry.disposalQuantity === null && existingCostEntry.disposalUnit === null && existingCostEntry.disposalUnitPrice === null && existingCostEntry.disposalTaxRate === null;
      calculated = isDisposal(input) && !legacyDisposal
        ? { ...calculateDisposal(input), laborCount: null, laborUnitPrice: null }
        : { ...calculateCost(input, existingCostEntry.project.laborUnitPrice, existingCostEntry), ...emptyDisposal };
    } catch {
      return c.json({ message: "数量・単位・単価・税率・人数・金額を確認してください。" }, 400);
    }

    const updatedCostEntry = await prisma.costEntry.update({
      where: {
        id: costId,
      },
      data: { ...c.req.valid("json"), ...calculated },
    });

    return c.json({ ...updatedCostEntry, laborCount: updatedCostEntry.laborCount?.toNumber() ?? null, disposalQuantity: updatedCostEntry.disposalQuantity?.toNumber() ?? null, disposalTaxRate: updatedCostEntry.disposalTaxRate?.toNumber() ?? null });
  },
);

app.delete("/projects/:projectId/costs/:costId", async (c) => {
  const company = c.get("authenticatedCompany");

  const projectId = Number(c.req.param("projectId"));

  const costId = Number(c.req.param("costId"));

  if (
    !Number.isInteger(projectId) ||
    projectId <= 0 ||
    !Number.isInteger(costId) ||
    costId <= 0
  ) {
    return c.json({ message: "IDが正しくありません" }, 400);
  }

  const existingCostEntry = await prisma.costEntry.findFirst({
    where: {
      id: costId,
      projectId,
      project: {
        is: {
          companyId: company.id,
        },
      },
    },
    select: {
      id: true,
    },
  });

  if (!existingCostEntry) {
    return c.json({ message: "工事原価が見つかりません" }, 404);
  }

  await prisma.costEntry.delete({
    where: {
      id: costId,
    },
  });

  return c.body(null, 204);
});

serve(
  {
    fetch: app.fetch,
    port: 3000,
  },
  (info) => {
    console.log(`Server is running on http://localhost:${info.port}`);
  },
);
