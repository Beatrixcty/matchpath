import { eq } from "drizzle-orm";
import { getChatGPTUser } from "../../chatgpt-auth";
import { getDb } from "../../../db";
import { userStates } from "../../../db/schema";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  const [row] = await getDb().select().from(userStates).where(eq(userStates.userId, user.userId)).limit(1);
  return Response.json({ authenticated: true, email: user.email, state: row ? JSON.parse(row.payload) : null, updatedAt: row?.updatedAt ?? null });
}

export async function PUT(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ authenticated: false }, { status: 401 });
  const state = await request.json();
  const payload = JSON.stringify(state);
  if (payload.length > 250_000) return Response.json({ error: "State is too large" }, { status: 413 });
  const updatedAt = new Date().toISOString();
  await getDb().insert(userStates).values({ userId: user.userId, payload, updatedAt })
    .onConflictDoUpdate({ target: userStates.userId, set: { payload, updatedAt } });
  return Response.json({ authenticated: true, saved: true, updatedAt });
}
