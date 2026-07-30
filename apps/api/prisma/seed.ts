import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const andron = await prisma.user.upsert({ where: { primaryEmail: "andron.demo@krasun.local" }, update: {}, create: { primaryEmail: "andron.demo@krasun.local", username: "andron", displayName: "Andron", onboardingCompleted: true } });
  const lena = await prisma.user.upsert({ where: { primaryEmail: "lena.demo@krasun.local" }, update: {}, create: { primaryEmail: "lena.demo@krasun.local", username: "lena", displayName: "Lena", onboardingCompleted: true } });
  let group = await prisma.group.findFirst({ where: { ownerId: andron.id, name: "Toronto crew" }, include: { conversation: true } });
  if (!group) {
    group = await prisma.group.create({ data: { name: "Toronto crew", description: "Campus friends and shared places", ownerId: andron.id, inviteCode: "TORONTO26", joinMode: "OPEN", members: { create: [{ userId: andron.id, role: "OWNER" }, { userId: lena.id, role: "MEMBER" }] }, conversation: { create: { type: "GROUP", title: "Toronto crew", participants: { create: [{ userId: andron.id }, { userId: lena.id }] } } } }, include: { conversation: true } });
  }
  if (group.conversation && await prisma.message.count({ where: { conversationId: group.conversation.id } }) === 0) {
    await prisma.message.createMany({ data: [
      { conversationId: group.conversation.id, senderId: lena.id, type: "TEXT", text: "I found the quietest place near campus." },
      { conversationId: group.conversation.id, senderId: andron.id, type: "TEXT", text: "Perfect. I’m walking over now." }
    ] });
  }
  const spot = await prisma.spot.findFirst({ where: { ownerId: lena.id, title: "Robarts Library", deletedAt: null } });
  if (!spot) await prisma.spot.create({ data: { ownerId: lena.id, title: "Robarts Library", description: "Quiet floors and a good meeting point.", visibility: "PUBLIC", latitude: 43.6644, longitude: -79.3997 } });
  await prisma.userLocation.upsert({ where: { userId: lena.id }, update: {}, create: { userId: lena.id, state: "FROZEN", latitude: 43.6636, longitude: -79.3972, accuracy: 10, frozenAt: new Date() } });
  await prisma.mapAvatar.upsert({ where: { userId: lena.id }, update: {}, create: { userId: lena.id, type: "EMOJI", value: "📚" } });
  console.info(`Seeded Krasun demo group ${group.id} with invite TORONTO26`);
}

main().finally(() => prisma.$disconnect());
