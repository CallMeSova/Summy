import { handler, ok } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const GET = handler(async () => {
  const user = await getSessionUser();
  return ok({ user });
});
