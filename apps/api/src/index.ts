import "dotenv/config";
import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { zValidator } from "@hono/zod-validator";
import { PrismaPg } from "@prisma/adapter-pg";
import { z } from "zod";
import { PrismaClient } from "./generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URLが設定されていません");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "http://localhost:5173",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);

const createProjectSchema = z.object({
  address: z.string().trim().min(1),
  structure: z.string().trim().min(1),
  areaTsubo: z.number().positive(),
  contractPrice: z.number().int().min(0),
  startDate: z.string().trim().min(1).pipe(z.coerce.date()),
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
  amount: z.number().int().positive(),
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
  amount: z.number().int().positive(),
  occurredAt: z.string().trim().min(1).pipe(z.coerce.date()),
  memo: z.string().trim().max(200).nullable(),
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/projects", async (c) => {
  const projects = await prisma.project.findMany({
    include: {
      costs: {
        select: {
          amount: true,
        },
      },
    },
    orderBy: {
      id: "asc",
    },
  });

  const projectsWithCost = projects.map(({ costs, ...project }) => ({
    ...project,
    cost: costs.reduce((total, entry) => total + entry.amount, 0),
  }));

  return c.json(projectsWithCost);
});

app.get("/projects/:id", async (c) => {
  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const project = await prisma.project.findUnique({
    where: {
      id: projectId,
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

  const cost = project.costs.reduce((total, entry) => total + entry.amount, 0);

  return c.json({
    ...project,
    cost,
  });
});

app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const project = await prisma.project.create({
    data: c.req.valid("json"),
  });

  return c.json(
    {
      ...project,
      cost: 0,
    },
    201,
  );
});

app.put("/projects/:id", zValidator("json", createProjectSchema), async (c) => {
  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
    },
    select: {
      id: true,
    },
  });

  if (!existingProject) {
    return c.json({ message: "現場が見つかりません" }, 404);
  }

  const updatedProject = await prisma.project.update({
    where: {
      id: projectId,
    },
    data: c.req.valid("json"),
    include: {
      costs: {
        select: {
          amount: true,
        },
      },
    },
  });

  const { costs, ...project } = updatedProject;

  const cost = costs.reduce((total, entry) => total + entry.amount, 0);

  return c.json({
    ...project,
    cost,
  });
});

app.delete("/projects/:id", async (c) => {
  const projectId = Number(c.req.param("id"));

  if (!Number.isInteger(projectId) || projectId <= 0) {
    return c.json({ message: "現場IDが正しくありません" }, 400);
  }

  const existingProject = await prisma.project.findUnique({
    where: {
      id: projectId,
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
    const projectId = Number(c.req.param("id"));

    if (!Number.isInteger(projectId) || projectId <= 0) {
      return c.json({ message: "現場IDが正しくありません" }, 400);
    }

    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
      },
      select: {
        id: true,
      },
    });

    if (!project) {
      return c.json({ message: "現場が見つかりません" }, 404);
    }

    const costEntry = await prisma.costEntry.create({
      data: {
        projectId,
        ...c.req.valid("json"),
      },
    });

    return c.json(costEntry, 201);
  },
);

app.put(
  "/projects/:projectId/costs/:costId",
  zValidator("json", updateCostEntrySchema),
  async (c) => {
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
      },
      select: {
        id: true,
      },
    });

    if (!existingCostEntry) {
      return c.json({ message: "工事原価が見つかりません" }, 404);
    }

    const updatedCostEntry = await prisma.costEntry.update({
      where: {
        id: costId,
      },
      data: c.req.valid("json"),
    });

    return c.json(updatedCostEntry);
  },
);

app.delete("/projects/:projectId/costs/:costId", async (c) => {
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
