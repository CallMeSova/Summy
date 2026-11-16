import LessonForm from "@/components/LessonForm";

export const metadata = { title: "New lesson" };

export default async function NewLesson({ searchParams }) {
  const sp = await searchParams;
  return <LessonForm defaultCourseId={sp?.course ? Number(sp.course) || null : null} />;
}

