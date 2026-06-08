"use client";

import * as React from "react";
import {
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  Circle,
  GraduationCap,
  Plus,
  Trash2,
} from "lucide-react";
import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  toast,
} from "@pandaclock/ui";
import { usePermission } from "@/lib/session-context";

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
  published: boolean;
  authorName: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CourseLesson {
  id: string;
  title: string;
  content: string;
  sortOrder: number;
  completed: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  status: string;
  lessonCount: number;
  enrolled: boolean;
  progress: number;
  completed: boolean;
  createdAt: string;
}

interface CourseDetail extends Course {
  lessons: CourseLesson[];
}

const COURSE_STATUS: Record<
  string,
  { label: string; variant: "secondary" | "success" | "warning" }
> = {
  DRAFT: { label: "Черновик", variant: "secondary" },
  PUBLISHED: { label: "Опубликован", variant: "success" },
  ARCHIVED: { label: "Архив", variant: "warning" },
};

export function KnowledgeView() {
  const canWrite = usePermission("knowledge:write");
  return (
    <Tabs defaultValue="kb" className="space-y-4">
      <TabsList>
        <TabsTrigger value="kb">База знаний</TabsTrigger>
        <TabsTrigger value="courses">Курсы</TabsTrigger>
      </TabsList>
      <TabsContent value="kb">
        <KbTab canWrite={canWrite} />
      </TabsContent>
      <TabsContent value="courses">
        <CoursesTab canWrite={canWrite} />
      </TabsContent>
    </Tabs>
  );
}

/* ───────── База знаний ───────── */

function KbTab({ canWrite }: { canWrite: boolean }) {
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [dialogArticle, setDialogArticle] = React.useState<Article | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      if (category) params.set("category", category);
      const res = await fetch(`/api/knowledge/articles?${params.toString()}`);
      setArticles(res.ok ? ((await res.json()) as Article[]) : []);
    } catch {
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }, [q, category]);

  React.useEffect(() => {
    const t = setTimeout(() => void load(), 250);
    return () => clearTimeout(t);
  }, [load]);

  const categories = React.useMemo(
    () => Array.from(new Set(articles.map((a) => a.category))).sort(),
    [articles],
  );

  if (openId) {
    return (
      <ArticleReader
        articleId={openId}
        canWrite={canWrite}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
        onEdit={(a) => {
          setDialogArticle(a);
          setDialogOpen(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Поиск по статьям…"
          className="max-w-xs"
        />
        {categories.length > 0 ? (
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
          >
            <option value="">Все категории</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        ) : null}
        {canWrite ? (
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              setDialogArticle(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Новая статья
          </Button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : articles.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <BookOpen className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Статей пока нет.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {articles.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpenId(a.id)}
              className="border-border bg-card hover:border-primary rounded-lg border p-4 text-left transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-foreground font-semibold">{a.title}</span>
                {!a.published ? <Badge variant="secondary">Черновик</Badge> : null}
              </div>
              <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">
                {a.content.slice(0, 160) || "—"}
              </p>
              <p className="text-muted-foreground mt-2 text-xs">
                {a.category} · {new Date(a.updatedAt).toLocaleDateString("ru-RU")}
              </p>
            </button>
          ))}
        </div>
      )}

      <ArticleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={dialogArticle}
        onSaved={load}
      />
    </div>
  );
}

function ArticleReader({
  articleId,
  canWrite,
  onBack,
  onEdit,
}: {
  articleId: string;
  canWrite: boolean;
  onBack: () => void;
  onEdit: (a: Article) => void;
}) {
  const [article, setArticle] = React.useState<Article | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/knowledge/articles/${articleId}`);
        setArticle(res.ok ? ((await res.json()) as Article) : null);
      } catch {
        setArticle(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [articleId]);

  async function remove() {
    const res = await fetch(`/api/knowledge/articles/${articleId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Статья удалена");
      onBack();
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!article) return <p className="text-muted-foreground text-sm">Статья недоступна.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />К списку
        </Button>
        {canWrite ? (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => onEdit(article)}>
              Изменить
            </Button>
            <button
              type="button"
              onClick={remove}
              className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
              aria-label="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>
      <article className="border-border bg-card rounded-lg border p-6">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline">{article.category}</Badge>
          {!article.published ? <Badge variant="secondary">Черновик</Badge> : null}
        </div>
        <h1 className="text-foreground text-2xl font-bold">{article.title}</h1>
        <p className="text-muted-foreground mt-1 text-xs">
          {article.authorName ?? "—"} · {new Date(article.updatedAt).toLocaleDateString("ru-RU")}
        </p>
        <div className="text-foreground mt-4 whitespace-pre-wrap text-sm leading-relaxed">
          {article.content || "—"}
        </div>
      </article>
    </div>
  );
}

function ArticleDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: Article | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [category, setCategory] = React.useState("Общее");
  const [content, setContent] = React.useState("");
  const [published, setPublished] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setCategory(editing?.category ?? "Общее");
      setContent(editing?.content ?? "");
      setPublished(editing?.published ?? true);
      setError(null);
    }
  }, [open, editing]);

  async function save() {
    if (title.trim().length < 2) {
      setError("Введите заголовок");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      title: title.trim(),
      category: category.trim() || "Общее",
      content,
      published,
    };
    try {
      const res = await fetch(
        editing ? `/api/knowledge/articles/${editing.id}` : "/api/knowledge/articles",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Статья обновлена" : "Статья создана");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить статью" : "Новая статья"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-2">
              <Label htmlFor="kb-title">Заголовок</Label>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Как оформить отпуск"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kb-cat">Категория</Label>
              <Input
                id="kb-cat"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="HR"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="kb-content">Содержание</Label>
            <textarea
              id="kb-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={10}
              className="border-border bg-card focus-ring w-full resize-y rounded-md border px-3 py-2 text-sm"
              placeholder="Текст статьи…"
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Опубликовать (видно сотрудникам)
          </label>
          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ───────── Курсы ───────── */

function CoursesTab({ canWrite }: { canWrite: boolean }) {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [openId, setOpenId] = React.useState<string | null>(null);
  const [dialogCourse, setDialogCourse] = React.useState<CourseDetail | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/knowledge/courses");
      setCourses(res.ok ? ((await res.json()) as Course[]) : []);
    } catch {
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (openId) {
    return (
      <CoursePlayer
        courseId={openId}
        canWrite={canWrite}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
        onEdit={(c) => {
          setDialogCourse(c);
          setDialogOpen(true);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      {canWrite ? (
        <div className="flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setDialogCourse(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Новый курс
          </Button>
        </div>
      ) : null}

      {loading ? (
        <p className="text-muted-foreground text-sm">Загрузка…</p>
      ) : courses.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          <GraduationCap className="mx-auto mb-2 h-8 w-8 opacity-40" />
          Курсов пока нет.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const st = COURSE_STATUS[c.status];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setOpenId(c.id)}
                className="border-border bg-card hover:border-primary flex flex-col rounded-lg border p-4 text-left transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-foreground font-semibold">{c.title}</span>
                  {canWrite && st ? <Badge variant={st.variant}>{st.label}</Badge> : null}
                </div>
                {c.description ? (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{c.description}</p>
                ) : null}
                <p className="text-muted-foreground mt-2 text-xs">{c.lessonCount} уроков</p>
                {c.enrolled ? (
                  <div className="mt-2 space-y-1">
                    <Progress value={c.progress} />
                    <p className="text-muted-foreground text-xs">
                      {c.completed ? "Завершён ✓" : `Прогресс ${c.progress}%`}
                    </p>
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>
      )}

      <CourseDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={dialogCourse}
        onSaved={load}
      />
    </div>
  );
}

function CoursePlayer({
  courseId,
  canWrite,
  onBack,
  onEdit,
}: {
  courseId: string;
  canWrite: boolean;
  onBack: () => void;
  onEdit: (c: CourseDetail) => void;
}) {
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [activeLesson, setActiveLesson] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/knowledge/courses/${courseId}`);
      const data = res.ok ? ((await res.json()) as CourseDetail) : null;
      setCourse(data);
      setActiveLesson((prev) => prev ?? data?.lessons[0]?.id ?? null);
    } catch {
      setCourse(null);
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function complete(lessonId: string) {
    setBusy(true);
    const res = await fetch(`/api/knowledge/courses/${courseId}/lessons/${lessonId}/complete`, {
      method: "POST",
    });
    setBusy(false);
    if (res.ok) {
      const data = (await res.json()) as CourseDetail;
      setCourse(data);
      if (data.completed) toast.success("Курс пройден! 🎉");
    }
  }

  async function remove() {
    const res = await fetch(`/api/knowledge/courses/${courseId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Курс удалён");
      onBack();
    }
  }

  if (loading) return <p className="text-muted-foreground text-sm">Загрузка…</p>;
  if (!course) return <p className="text-muted-foreground text-sm">Курс недоступен.</p>;

  const lesson = course.lessons.find((l) => l.id === activeLesson) ?? course.lessons[0];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="ghost" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" />К курсам
        </Button>
        <div className="min-w-0">
          <h2 className="text-foreground truncate text-lg font-semibold">{course.title}</h2>
          <p className="text-muted-foreground text-xs">
            {course.completed ? "Завершён ✓" : `Прогресс ${course.progress}%`}
          </p>
        </div>
        {canWrite ? (
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => onEdit(course)}>
              Изменить
            </Button>
            <button
              type="button"
              onClick={remove}
              className="hover:bg-danger-light text-muted-foreground hover:text-danger rounded p-1.5"
              aria-label="Удалить"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ) : null}
      </div>

      <Progress value={course.progress} />

      {course.lessons.length === 0 ? (
        <div className="border-border text-muted-foreground rounded-lg border border-dashed p-8 text-center text-sm">
          В курсе пока нет уроков.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-[260px_1fr]">
          <div className="border-border divide-border bg-card h-fit divide-y rounded-lg border">
            {course.lessons.map((l, idx) => (
              <button
                key={l.id}
                type="button"
                onClick={() => setActiveLesson(l.id)}
                className={`flex w-full items-center gap-2 p-3 text-left text-sm ${
                  l.id === lesson?.id ? "bg-muted/60" : "hover:bg-muted/30"
                }`}
              >
                {l.completed ? (
                  <CheckCircle2 className="text-success h-4 w-4 shrink-0" />
                ) : (
                  <Circle className="text-muted-foreground h-4 w-4 shrink-0" />
                )}
                <span className="text-foreground truncate">
                  {idx + 1}. {l.title}
                </span>
              </button>
            ))}
          </div>

          {lesson ? (
            <div className="border-border bg-card rounded-lg border p-5">
              <h3 className="text-foreground text-lg font-semibold">{lesson.title}</h3>
              <div className="text-foreground mt-3 whitespace-pre-wrap text-sm leading-relaxed">
                {lesson.content || "—"}
              </div>
              <div className="mt-4">
                {lesson.completed ? (
                  <Badge variant="success">
                    <Check className="mr-1 h-3 w-3" />
                    Пройдено
                  </Badge>
                ) : (
                  <Button size="sm" onClick={() => complete(lesson.id)} loading={busy}>
                    Отметить пройденным
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

interface DraftLesson {
  title: string;
  content: string;
}

function CourseDialog({
  open,
  onOpenChange,
  editing,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  editing: CourseDetail | null;
  onSaved: () => Promise<void>;
}) {
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [status, setStatus] = React.useState("DRAFT");
  const [lessons, setLessons] = React.useState<DraftLesson[]>([]);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTitle(editing?.title ?? "");
      setDescription(editing?.description ?? "");
      setStatus(editing?.status ?? "DRAFT");
      setLessons(
        editing?.lessons.map((l) => ({ title: l.title, content: l.content })) ?? [
          { title: "", content: "" },
        ],
      );
      setError(null);
    }
  }, [open, editing]);

  function addLesson() {
    setLessons((p) => [...p, { title: "", content: "" }]);
  }
  function updateLesson(i: number, patch: Partial<DraftLesson>) {
    setLessons((p) => p.map((l, idx) => (idx === i ? { ...l, ...patch } : l)));
  }
  function removeLesson(i: number) {
    setLessons((p) => p.filter((_, idx) => idx !== i));
  }

  async function save() {
    if (title.trim().length < 2) {
      setError("Введите название курса");
      return;
    }
    const prepared = lessons
      .map((l) => ({ title: l.title.trim(), content: l.content }))
      .filter((l) => l.title.length > 0);
    if (prepared.length === 0) {
      setError("Добавьте хотя бы один урок");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: Record<string, unknown> = {
      title: title.trim(),
      description: description.trim() || undefined,
      lessons: prepared,
    };
    if (editing) payload.status = status;
    try {
      const res = await fetch(
        editing ? `/api/knowledge/courses/${editing.id}` : "/api/knowledge/courses",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!res.ok) {
        const b = (await res.json().catch(() => ({}))) as { message?: string };
        setError(b.message ?? "Не удалось сохранить");
        return;
      }
      toast.success(editing ? "Курс обновлён" : "Курс создан (черновик)");
      onOpenChange(false);
      await onSaved();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Изменить курс" : "Новый курс"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="crs-title">Название</Label>
            <Input
              id="crs-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Введение в компанию"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="crs-desc">Описание</Label>
            <textarea
              id="crs-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="border-border bg-card focus-ring w-full resize-none rounded-md border px-3 py-2 text-sm"
              placeholder="О чём курс…"
            />
          </div>
          {editing ? (
            <div className="space-y-2">
              <Label htmlFor="crs-status">Статус</Label>
              <select
                id="crs-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="border-border bg-card focus-ring h-9 rounded-md border px-3 text-sm"
              >
                <option value="DRAFT">Черновик</option>
                <option value="PUBLISHED">Опубликован</option>
                <option value="ARCHIVED">Архив</option>
              </select>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Уроки</Label>
              <Button size="sm" variant="outline" onClick={addLesson}>
                <Plus className="h-4 w-4" />
                Урок
              </Button>
            </div>
            {lessons.map((l, i) => (
              <div key={i} className="border-border space-y-2 rounded-md border p-3">
                <div className="flex items-start gap-2">
                  <Input
                    value={l.title}
                    onChange={(e) => updateLesson(i, { title: e.target.value })}
                    placeholder={`Урок ${i + 1} — заголовок`}
                  />
                  <button
                    type="button"
                    onClick={() => removeLesson(i)}
                    className="hover:bg-danger-light text-muted-foreground hover:text-danger mt-1.5 rounded p-1"
                    aria-label="Удалить урок"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <textarea
                  value={l.content}
                  onChange={(e) => updateLesson(i, { content: e.target.value })}
                  rows={3}
                  className="border-border bg-card focus-ring w-full resize-y rounded-md border px-3 py-2 text-sm"
                  placeholder="Материал урока…"
                />
              </div>
            ))}
          </div>

          {error ? (
            <p className="text-danger text-sm font-semibold" role="alert">
              {error}
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Отмена
            </Button>
            <Button onClick={save} loading={saving} loadingText="Сохраняем…">
              Сохранить
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
