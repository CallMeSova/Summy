import LessonForm from "@/components/LessonForm";

export default async function EditLesson({ params }) {
  const { id } = await params;
  return <LessonForm lessonId={Number(id)} />;
}

