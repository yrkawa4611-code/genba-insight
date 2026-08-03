-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "address" TEXT NOT NULL,
    "structure" TEXT NOT NULL,
    "areaTsubo" DOUBLE PRECISION NOT NULL,
    "contractPrice" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);
