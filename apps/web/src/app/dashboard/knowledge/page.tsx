import { GraduationCap } from "lucide-react";
import { PageHeader } from "@pandaclock/ui";
import { PageBreadcrumbs } from "../_components/page-breadcrumbs";
import { KnowledgeView } from "./_components/knowledge-view";

export default async function KnowledgePage({
  searchParams,
}: {
  searchParams: Promise<{ article?: string; course?: string }>;
}) {
  const { article, course } = await searchParams;
  return (
    <>
      <PageHeader
        breadcrumbs={<PageBreadcrumbs />}
        icon={<GraduationCap className="h-6 w-6" />}
        title="Обучение"
        description="База знаний и онлайн-курсы"
      />
      <KnowledgeView initialArticle={article} initialCourse={course} />
    </>
  );
}
