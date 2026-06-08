import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Check, CheckCircle2, Circle, GraduationCap } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Card, EmptyState, Screen } from "@/components/ui";

interface Course {
  id: string;
  title: string;
  description: string | null;
  lessonCount: number;
  enrolled: boolean;
  progress: number;
  completed: boolean;
}

interface CourseLesson {
  id: string;
  title: string;
  content: string;
  completed: boolean;
}

interface CourseDetail extends Course {
  lessons: CourseLesson[];
}

interface Article {
  id: string;
  title: string;
  content: string;
  category: string;
}

export default function KnowledgeScreen() {
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [articles, setArticles] = React.useState<Article[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [course, setCourse] = React.useState<CourseDetail | null>(null);
  const [article, setArticle] = React.useState<Article | null>(null);

  const load = React.useCallback(async () => {
    try {
      const [c, a] = await Promise.all([
        api<Course[]>("/knowledge/courses"),
        api<Article[]>("/knowledge/articles"),
      ]);
      setCourses(c);
      setArticles(a);
      setError(false);
    } catch {
      setError(true);
    }
  }, []);

  React.useEffect(() => {
    void (async () => {
      await load();
      setLoading(false);
    })();
  }, [load]);

  if (course) {
    return (
      <CourseView
        course={course}
        setCourse={setCourse}
        onBack={() => {
          setCourse(null);
          void load();
        }}
      />
    );
  }
  if (article) {
    return <ArticleView article={article} onBack={() => setArticle(null)} />;
  }

  async function openCourse(id: string) {
    try {
      setCourse(await api<CourseDetail>(`/knowledge/courses/${id}`));
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть курс");
    }
  }
  async function openArticle(id: string) {
    try {
      setArticle(await api<Article>(`/knowledge/articles/${id}`));
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть статью");
    }
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title="Обучение" subtitle="Курсы и база знаний" onBack={() => router.back()} />

      {loading ? (
        <Loader />
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<GraduationCap size={40} color="#9CA3AF" />}
            title="Не удалось загрузить"
            description="Проверьте соединение и потяните вниз."
          />
        </View>
      ) : (
        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={async () => {
                setRefreshing(true);
                await load();
                setRefreshing(false);
              }}
              tintColor="#5B4FE2"
            />
          }
        >
          {courses.length > 0 ? (
            <>
              <Text className="text-muted-foreground mb-2 px-1 text-xs font-bold uppercase tracking-wider">
                Курсы
              </Text>
              {courses.map((c) => (
                <Pressable key={c.id} onPress={() => openCourse(c.id)}>
                  <Card className="mb-2" padding="md">
                    <View className="flex-row items-center justify-between gap-2">
                      <Text className="text-foreground flex-1 text-base font-bold">{c.title}</Text>
                      {c.completed ? <Badge variant="success">Пройден</Badge> : null}
                    </View>
                    <Text className="text-muted-foreground mt-0.5 text-xs">
                      {c.lessonCount} уроков
                      {c.enrolled ? ` · прогресс ${c.progress}%` : ""}
                    </Text>
                    {c.enrolled ? (
                      <View className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                        <View
                          className="bg-primary-500 h-full rounded-full"
                          style={{ width: `${c.progress}%` }}
                        />
                      </View>
                    ) : null}
                  </Card>
                </Pressable>
              ))}
            </>
          ) : null}

          <Text className="text-muted-foreground mb-2 mt-4 px-1 text-xs font-bold uppercase tracking-wider">
            База знаний
          </Text>
          {articles.length === 0 ? (
            <Card padding="md">
              <Text className="text-muted-foreground text-sm">Статей пока нет.</Text>
            </Card>
          ) : (
            articles.map((a) => (
              <Pressable key={a.id} onPress={() => openArticle(a.id)}>
                <Card className="mb-2" padding="md">
                  <Text className="text-foreground text-base font-bold">{a.title}</Text>
                  <Text className="text-muted-foreground mt-0.5 text-xs">{a.category}</Text>
                </Card>
              </Pressable>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function CourseView({
  course,
  setCourse,
  onBack,
}: {
  course: CourseDetail;
  setCourse: (c: CourseDetail) => void;
  onBack: () => void;
}) {
  const [activeLesson, setActiveLesson] = React.useState<string | null>(
    course.lessons[0]?.id ?? null,
  );
  const [busy, setBusy] = React.useState(false);
  const lesson = course.lessons.find((l) => l.id === activeLesson) ?? course.lessons[0];

  async function complete(lessonId: string) {
    setBusy(true);
    try {
      const updated = await api<CourseDetail>(
        `/knowledge/courses/${course.id}/lessons/${lessonId}/complete`,
        { method: "POST" },
      );
      setCourse(updated);
      if (updated.completed) Alert.alert("Поздравляем! 🎉", "Курс пройден.");
    } catch {
      Alert.alert("Ошибка", "Не удалось отметить урок.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header
        title={course.title}
        subtitle={course.completed ? "Завершён" : `Прогресс ${course.progress}%`}
        onBack={onBack}
      />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 16 }}>
        {course.lessons.length === 0 ? (
          <EmptyState
            icon={<GraduationCap size={40} color="#9CA3AF" />}
            title="Нет уроков"
            description="В этом курсе пока нет материалов."
          />
        ) : (
          <>
            <Card className="mb-4" padding="none">
              {course.lessons.map((l, idx) => (
                <Pressable
                  key={l.id}
                  onPress={() => setActiveLesson(l.id)}
                  className={`flex-row items-center gap-2 p-3 ${idx > 0 ? "border-border border-t" : ""} ${
                    l.id === lesson?.id ? "bg-neutral-50" : ""
                  }`}
                >
                  {l.completed ? (
                    <CheckCircle2 size={18} color="#22A06B" />
                  ) : (
                    <Circle size={18} color="#9CA3AF" />
                  )}
                  <Text className="text-foreground flex-1 text-sm">
                    {idx + 1}. {l.title}
                  </Text>
                </Pressable>
              ))}
            </Card>

            {lesson ? (
              <Card padding="md">
                <Text className="text-foreground text-lg font-bold">{lesson.title}</Text>
                <Text className="text-foreground mt-2 text-sm leading-6">
                  {lesson.content || "—"}
                </Text>
                {lesson.completed ? (
                  <View className="mt-3 flex-row items-center gap-1.5">
                    <Check size={16} color="#22A06B" />
                    <Text className="text-success text-xs font-semibold">Пройдено</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => complete(lesson.id)}
                    disabled={busy}
                    className={`mt-3 items-center rounded-lg py-2.5 ${busy ? "bg-primary-300" : "bg-primary-500"}`}
                  >
                    <Text className="font-bold text-white">Отметить пройденным</Text>
                  </Pressable>
                )}
              </Card>
            ) : null}
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

function ArticleView({ article, onBack }: { article: Article; onBack: () => void }) {
  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={article.title} subtitle={article.category} onBack={onBack} />
      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 16 }}>
        <Text className="text-foreground text-2xl font-extrabold">{article.title}</Text>
        <Text className="text-foreground mt-4 text-sm leading-6">{article.content || "—"}</Text>
      </ScrollView>
    </Screen>
  );
}

function Header({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <View className="border-border flex-row items-center gap-3 border-b px-5 pb-3 pt-1">
      <Pressable onPress={onBack} hitSlop={8} accessibilityLabel="Назад">
        <ArrowLeft size={24} color="#5B4FE2" />
      </Pressable>
      <View className="flex-1">
        <Text className="text-foreground text-lg font-extrabold" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-muted-foreground text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}

function Loader() {
  return (
    <View className="flex-1 items-center justify-center">
      <ActivityIndicator size="large" color="#5B4FE2" />
    </View>
  );
}
