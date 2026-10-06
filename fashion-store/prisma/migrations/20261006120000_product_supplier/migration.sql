-- AlterTable
ALTER TABLE "Product" ADD COLUMN "supplier" TEXT,
ADD COLUMN "supplierSku" TEXT,
ADD COLUMN "supplierUrl" TEXT;

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN "supplier" TEXT,
ADD COLUMN "supplierSku" TEXT,
ADD COLUMN "supplierUrl" TEXT;
