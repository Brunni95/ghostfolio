-- CreateEnum
CREATE TYPE "CashflowRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');

-- CreateEnum
CREATE TYPE "CashflowType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateTable
CREATE TABLE "CashflowSeries" (
  "accountId" TEXT NOT NULL,
  "accountUserId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "description" TEXT,
  "id" TEXT NOT NULL,
  "lastOccurredAt" TIMESTAMP(3),
  "recurrence" "CashflowRecurrence" NOT NULL,
  "startDate" TIMESTAMP(3) NOT NULL,
  "endDate" TIMESTAMP(3),
  "timezone" TEXT NOT NULL DEFAULT 'UTC',
  "type" "CashflowType" NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,

  CONSTRAINT "CashflowSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cashflow" (
  "accountId" TEXT NOT NULL,
  "accountUserId" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "category" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "currency" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL,
  "description" TEXT,
  "id" TEXT NOT NULL,
  "seriesId" TEXT,
  "type" "CashflowType" NOT NULL,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "userId" TEXT NOT NULL,

  CONSTRAINT "Cashflow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CashflowSeries_accountId_idx" ON "CashflowSeries"("accountId");

-- CreateIndex
CREATE INDEX "CashflowSeries_category_idx" ON "CashflowSeries"("category");

-- CreateIndex
CREATE INDEX "CashflowSeries_recurrence_idx" ON "CashflowSeries"("recurrence");

-- CreateIndex
CREATE INDEX "CashflowSeries_startDate_idx" ON "CashflowSeries"("startDate");

-- CreateIndex
CREATE INDEX "CashflowSeries_type_idx" ON "CashflowSeries"("type");

-- CreateIndex
CREATE INDEX "CashflowSeries_userId_idx" ON "CashflowSeries"("userId");

-- CreateIndex
CREATE INDEX "Cashflow_accountId_idx" ON "Cashflow"("accountId");

-- CreateIndex
CREATE INDEX "Cashflow_category_idx" ON "Cashflow"("category");

-- CreateIndex
CREATE INDEX "Cashflow_date_idx" ON "Cashflow"("date");

-- CreateIndex
CREATE INDEX "Cashflow_seriesId_idx" ON "Cashflow"("seriesId");

-- CreateIndex
CREATE INDEX "Cashflow_type_idx" ON "Cashflow"("type");

-- CreateIndex
CREATE INDEX "Cashflow_userId_idx" ON "Cashflow"("userId");

-- AddForeignKey
ALTER TABLE "CashflowSeries" ADD CONSTRAINT "CashflowSeries_accountId_accountUserId_fkey" FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashflowSeries" ADD CONSTRAINT "CashflowSeries_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_accountId_accountUserId_fkey" FOREIGN KEY ("accountId", "accountUserId") REFERENCES "Account"("id", "userId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "CashflowSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Cashflow" ADD CONSTRAINT "Cashflow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
