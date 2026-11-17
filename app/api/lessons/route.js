import { handler, ok } from "@/lib/api";
import { createLesson, readLessonInput, validatePdf } from "@/lib/lessons";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const user = await requireUser();
  const { raw, file } = await readLessonInput(req);
  const pdfBuf = raw.content_type === "pdf" ? await validatePdf(file) : null;
  const id = await createLesson(user.id, raw, pdfBuf, file);
  return ok({ id }, 201);
});
