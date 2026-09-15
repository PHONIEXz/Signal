import bcrypt from "bcryptjs";
import { prisma } from "./prisma.ts";
export async function changePassword(userId: string, currentPassword: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { hashedPassword: true, passwordVersion: true } });
  if (!user?.hashedPassword) return "PROVIDER_ACCOUNT" as const;
  if (!(await bcrypt.compare(currentPassword, user.hashedPassword))) return "INCORRECT_PASSWORD" as const;
  const hashedPassword = await bcrypt.hash(password, 12);
  return prisma.$transaction(async (tx) => {
    const changed = await tx.user.updateMany({
      where: { id: userId, hashedPassword: user.hashedPassword, passwordVersion: user.passwordVersion },
      data: { hashedPassword, passwordVersion: { increment: 1 } },
    });
    if (!changed.count) return "STALE_PASSWORD" as const;
    await tx.passwordResetToken.deleteMany({ where: { userId } });
    await tx.session.deleteMany({ where: { userId } });
    return "CHANGED" as const;
  });
}
