-- CreateTable
CREATE TABLE "Robot" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "manual" BOOLEAN NOT NULL,
    "day" INTEGER NOT NULL,

    CONSTRAINT "Robot_pkey" PRIMARY KEY ("id")
);
