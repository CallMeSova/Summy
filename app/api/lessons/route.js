import { handler, ok } from "@/lib/api";
import { createLesson, readLessonInput, validatePdf } from "@/lib/lessons";

export const dynamic = "force-dynamic";

export const POST = handler(async (req) => {
  const { raw, file } = await readLessonInput(req);
  const pdfBuf = raw.content_type === "pdf" ? await validatePdf(file) : null;
  const id = createLesson(raw, pdfBuf, file);
  return ok({ id }, 201);
});

