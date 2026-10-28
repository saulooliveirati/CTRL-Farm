import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const lics = await prisma.userLicense.findMany({
  include: {
    user: { select: { id: true, email: true, name: true } },
    company: { select: { id: true, name: true } },
  },
});
console.log("ALL USER LICENSES IN CTRL-FARM DB:");
console.log(JSON.stringify(lics, null, 2));
await prisma.$disconnect();
