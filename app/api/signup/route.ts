import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { emailValue, passwordError } from "@/lib/auth-policy";
import { AuthInputError, PRIVATE_HEADERS, readAuthBody } from "@/lib/auth-http";
import { takeAuthQuota } from "@/lib/password-reset";

export async function POST(request: Request) {
  try {
    const body = await readAuthBody(request);
    const email = emailValue(body.email);
    const password = body.password;
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : "";
    const validation = passwordError(password);

    if (!email || validation) {
      return NextResponse.json(
        { error: !email ? "Enter a valid email address." : validation },
        { status: 400 }
      );
    }

    if (!(await takeAuthQuota("signup-global", "all", 30, 15 * 60 * 1000))) {
      return NextResponse.json({ error: "Too many requests. Please try again in 15 minutes." }, { status: 429, headers: PRIVATE_HEADERS });
    }
    const existing = await prisma.$queryRawUnsafe<{ id: string }[]>(
      'SELECT "id" FROM "User" WHERE lower("email") = ? LIMIT 1', email,
    );
    if (existing.length) {
      return NextResponse.json(
        { error: "An account with that email already exists." },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password as string, 12);

    await prisma.user.create({
      data: { name, email, hashedPassword },
    });

    return NextResponse.json({ success: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof AuthInputError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
    if (error && typeof error === "object" && "code" in error && error.code === "P2002") {
      return NextResponse.json({ error: "An account with that email already exists." }, { status: 409, headers: PRIVATE_HEADERS });
    }
    return NextResponse.json({ error: "Account creation is temporarily unavailable." }, { status: 503, headers: PRIVATE_HEADERS });
  }
}
