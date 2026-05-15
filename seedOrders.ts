import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const tenantId = "cmp5d22px0000e9s6v0a7148q";

  const customer1 = await prisma.customer.findFirst({ where: { tenantId } });
  const p1 = await prisma.product.findFirst({ where: { tenantId } });

  if (customer1 && p1) {
    await prisma.order.create({
      data: {
        orderNumber: "ORD-999999",
        totalAmount: p1.price * 2,
        notes: "Örnek eklendi",
        tenantId,
        customerId: customer1.id,
        items: {
          create: [
            { productId: p1.id, quantity: 2, unitPrice: p1.price }
          ]
        }
      }
    });
    console.log("Seeded extra order");
  } else {
    console.log("Could not find customer or product");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
