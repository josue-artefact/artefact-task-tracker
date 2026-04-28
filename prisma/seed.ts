import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Wipe existing
  await prisma.taskTransfer.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.task.deleteMany();
  await prisma.user.deleteMany();
  await prisma.team.deleteMany();
  await prisma.client.deleteMany();

  // Teams
  const design = await prisma.team.create({ data: { name: "Design" } });
  const growth = await prisma.team.create({ data: { name: "Growth" } });
  const ops    = await prisma.team.create({ data: { name: "Operations" } });

  // Users (handles given by user)
  const team = [
    { handle: "josh",     name: "Josh",     role: "PM",     teamId: design.id },
    { handle: "kat",      name: "Kat",      role: "MEMBER", teamId: design.id },
    { handle: "nolita",   name: "Nolita",   role: "MEMBER", teamId: design.id },
    { handle: "sofi",     name: "Sofi",     role: "MEMBER", teamId: growth.id },
    { handle: "marce",    name: "Marce",    role: "MEMBER", teamId: growth.id },
    { handle: "rigo",     name: "Rigo",     role: "MEMBER", teamId: ops.id },
    { handle: "betzaida", name: "Betzaida", role: "MEMBER", teamId: ops.id },
    { handle: "frida",    name: "Frida",    role: "MEMBER", teamId: design.id },
  ] as const;

  const users: Record<string, string> = {};
  for (const u of team) {
    const created = await prisma.user.create({ data: u });
    users[u.handle] = created.id;
  }

  // Sample clients
  const houseAtlas = await prisma.client.create({
    data: { name: "House Atlas", description: "Modern furniture brand · multi-year partnership" },
  });
  const fjordCo = await prisma.client.create({
    data: { name: "Fjord & Co.", description: "Outdoor apparel · seasonal launches" },
  });
  const lumen = await prisma.client.create({
    data: { name: "Lumen Studio", description: "Boutique skincare · D2C launch" },
  });
  const internal = await prisma.client.create({
    data: { name: "Artefact (interno)", description: "Operaciones del estudio y proyectos internos" },
  });

  // Sample tasks (now: client + team direct, no project layer)
  const sample = [
    { title: "Definir nuevos color tokens",     priority: "HIGH",   status: "DOING", clientId: houseAtlas.id, teamId: design.id, assigneeId: users.kat,      createdById: users.josh },
    { title: "Bocetar variantes del monograma", priority: "MEDIUM", status: "TODO",  clientId: houseAtlas.id, teamId: design.id, assigneeId: users.nolita,   createdById: users.josh },
    { title: "Auditoría de tipografía legacy",  priority: "LOW",    status: "TODO",  clientId: houseAtlas.id, teamId: design.id, assigneeId: users.frida,    createdById: users.josh },
    { title: "Storyboard del film hero",        priority: "URGENT", status: "DOING", clientId: fjordCo.id,    teamId: growth.id, assigneeId: users.sofi,     createdById: users.josh },
    { title: "Plan de inversión en paid",       priority: "HIGH",   status: "TODO",  clientId: fjordCo.id,    teamId: growth.id, assigneeId: users.marce,    createdById: users.josh },
    { title: "Wireframes de páginas de producto", priority: "HIGH", status: "DOING", clientId: lumen.id,      teamId: design.id, assigneeId: users.kat,      createdById: users.josh },
    { title: "Selección de fotografía de producto", priority: "MEDIUM", status: "TODO", clientId: lumen.id,   teamId: design.id, assigneeId: users.nolita,   createdById: users.josh },
    { title: "Pipeline de facturación a vendors", priority: "MEDIUM", status: "TODO", clientId: internal.id,  teamId: ops.id,    assigneeId: users.rigo,     createdById: users.josh },
    { title: "Roll-up de OKRs trimestrales",    priority: "LOW",    status: "DONE",  clientId: internal.id,   teamId: ops.id,    assigneeId: users.betzaida, createdById: users.josh },
  ];

  for (const t of sample) {
    await prisma.task.create({ data: t });
  }

  // Sample announcements
  const inAWeek = new Date();
  inAWeek.setDate(inAWeek.getDate() + 7);

  await prisma.announcement.createMany({
    data: [
      {
        title: "Bienvenidos a la nueva plataforma del estudio",
        body: "Estamos estrenando el task tracker interno. Si encuentras algo raro, avísale a @josh — todavía estamos pulindo detalles.",
        pinned: true,
        authorId: users.josh,
      },
      {
        title: "Junta de equipo este viernes",
        body: "Nos vemos el viernes a las 10am en la sala grande. Trae tus prioridades para el siguiente sprint.",
        expiresAt: inAWeek,
        authorId: users.josh,
      },
    ],
  });

  console.log("Seeded:");
  console.log(`  ${team.length} users · 3 teams · 4 clients · ${sample.length} tasks · 2 announcements`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
