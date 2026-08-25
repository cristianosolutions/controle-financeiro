import { parseAdminPromotionArgs } from "../lib/admin-bootstrap.js";
import { prisma } from "../lib/prisma.js";

async function main() {
  const { email, confirmed } = parseAdminPromotionArgs(process.argv.slice(2));
  if (!confirmed) throw new Error("Confirme a promoção adicionando --confirm ao comando.");
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, name: true, email: true, role: true, isActive: true } });
  if (!user) throw new Error("Usuário não encontrado. Cadastre a conta antes de promovê-la.");
  if (user.role === "ADMIN" && user.isActive) {
    console.log(`${user.email} já é um administrador ativo.`);
    return;
  }
  await prisma.$transaction(async (transaction) => {
    await transaction.user.update({ where: { id: user.id }, data: { role: "ADMIN", isActive: true } });
    await transaction.auditLog.create({ data: { action: "INITIAL_ADMIN_PROMOTED", entityType: "User", entityId: user.id, description: `Usuário ${user.email} promovido por comando administrativo local`, metadata: { source: "cli" } } });
  });
  console.log(`${user.email} foi promovido a administrador e ativado.`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : "Não foi possível promover o administrador.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
