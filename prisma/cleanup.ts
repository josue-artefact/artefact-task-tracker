import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Antes de limpiar:");
  console.log("  Tareas:        ", await prisma.task.count());
  console.log("  Clientes:      ", await prisma.client.count());
  console.log("  Anuncios:      ", await prisma.announcement.count());
  console.log("  Time entries:  ", await prisma.timeEntry.count());
  console.log("  Comments:      ", await prisma.comment.count());
  console.log("  Transfers:     ", await prisma.taskTransfer.count());
  console.log();

  // Borrar en orden de dependencia. Aunque la mayoría tiene cascade,
  // ser explícito hace el script más legible y seguro.
  const r1 = await prisma.timeEntryEdit.deleteMany();
  const r2 = await prisma.timeEntry.deleteMany();
  const r3 = await prisma.taskTransfer.deleteMany();
  const r4 = await prisma.comment.deleteMany();
  const r5 = await prisma.task.deleteMany();
  const r6 = await prisma.client.deleteMany();
  const r7 = await prisma.announcement.deleteMany();

  console.log("Borrado:");
  console.log(`  ${r1.count} time entry edits`);
  console.log(`  ${r2.count} time entries`);
  console.log(`  ${r3.count} task transfers`);
  console.log(`  ${r4.count} comments`);
  console.log(`  ${r5.count} tasks`);
  console.log(`  ${r6.count} clients`);
  console.log(`  ${r7.count} announcements`);
  console.log();
  console.log("Quedó:");
  console.log("  Users:    ", await prisma.user.count(), "(equipo real, intactos)");
  console.log("  Teams:    ", await prisma.team.count(), "(intactos)");
  console.log("  Tareas:   ", await prisma.task.count());
  console.log("  Clientes: ", await prisma.client.count());
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
