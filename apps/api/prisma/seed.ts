import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";

const getRequiredEnv = (name: string) => {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name}が設定されていません`);
  }

  return value;
};

const connectionString = getRequiredEnv("DATABASE_URL");

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

const main = async () => {
  const companyCode = getRequiredEnv("SEED_COMPANY_CODE");

  const companyName = getRequiredEnv("SEED_COMPANY_NAME");

  const companyPassword = getRequiredEnv("SEED_COMPANY_PASSWORD");

  const passwordHash = await bcrypt.hash(companyPassword, 12);

  await prisma.company.upsert({
    where: {
      code: companyCode,
    },
    update: {
      name: companyName,
      passwordHash,
    },
    create: {
      code: companyCode,
      name: companyName,
      passwordHash,
    },
  });

  console.log(`会社アカウントを作成しました：${companyCode}`);
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
