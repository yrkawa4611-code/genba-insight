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
    allowMethods: ["GET", "POST", "OPTIONS"],
  }),
);

const createProjectSchema = z.object({
  address: z.string().trim().min(1),
  structure: z.string().trim().min(1),
  areaTsubo: z.number().positive(),
  contractPrice: z.number().int().min(0),
  startDate: z.string().trim().min(1).pipe(z.coerce.date()),
});

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

app.get("/projects", async (c) => {
  const projects = await prisma.project.findMany({
    orderBy: {
      id: "asc",
    },
  });

  return c.json(projects);
});

app.post("/projects", zValidator("json", createProjectSchema), async (c) => {
  const project = await prisma.project.create({
    data: c.req.valid("json"),
  });

  return c.json(project, 201);
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
