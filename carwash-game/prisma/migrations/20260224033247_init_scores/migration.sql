-- CreateTable
CREATE TABLE "Score" (
    "id" SERIAL NOT NULL,
    "locationId" TEXT NOT NULL,
    "nickname" TEXT,
    "value" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Score_pkey" PRIMARY KEY ("id")
);
