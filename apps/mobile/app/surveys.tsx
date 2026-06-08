import * as React from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import { ArrowLeft, Check, ClipboardList } from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Badge, Card, EmptyState, Screen } from "@/components/ui";

interface ActiveSurvey {
  id: string;
  title: string;
  description: string | null;
  type: string;
  anonymous: boolean;
  completed: boolean;
}

interface SurveyQuestion {
  id: string;
  text: string;
  kind: string;
  options: string[] | null;
  required: boolean;
}

interface RespondentSurvey {
  id: string;
  title: string;
  description: string | null;
  anonymous: boolean;
  status: string;
  completed: boolean;
  questions: SurveyQuestion[];
}

type Answer = { valueInt?: number; valueText?: string };

export default function SurveysScreen() {
  const [surveys, setSurveys] = React.useState<ActiveSurvey[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState(false);
  const [filling, setFilling] = React.useState<RespondentSurvey | null>(null);

  const load = React.useCallback(async () => {
    try {
      setSurveys(await api<ActiveSurvey[]>("/surveys/active"));
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

  async function openFill(id: string) {
    try {
      setFilling(await api<RespondentSurvey>(`/surveys/${id}/fill`));
    } catch {
      Alert.alert("Ошибка", "Не удалось открыть опрос");
    }
  }

  if (filling) {
    return (
      <FillView
        survey={filling}
        onClose={() => setFilling(null)}
        onDone={() => {
          setFilling(null);
          void load();
        }}
      />
    );
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />

      <Header title="Опросы" subtitle="Активные опросы" onBack={() => router.back()} />

      {loading ? (
        <Loader />
      ) : error ? (
        <View className="flex-1 px-5 pt-10">
          <EmptyState
            icon={<ClipboardList size={40} color="#9CA3AF" />}
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
          {surveys.length === 0 ? (
            <EmptyState
              icon={<ClipboardList size={40} color="#9CA3AF" />}
              title="Активных опросов нет"
              description="Когда HR опубликует опрос, он появится здесь."
            />
          ) : (
            surveys.map((s) => (
              <Card key={s.id} className="mb-2" padding="md">
                <View className="flex-row items-center justify-between gap-2">
                  <Text className="text-foreground flex-1 text-base font-bold">{s.title}</Text>
                  {s.type === "ENPS" ? <Badge variant="info">eNPS</Badge> : null}
                </View>
                {s.description ? (
                  <Text className="text-muted-foreground mt-1 text-sm">{s.description}</Text>
                ) : null}
                {s.completed ? (
                  <View className="mt-2 flex-row items-center gap-1.5">
                    <Check size={16} color="#22A06B" />
                    <Text className="text-success text-xs font-semibold">Пройдено</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => openFill(s.id)}
                    className="bg-primary-500 mt-3 items-center rounded-lg py-2.5"
                  >
                    <Text className="font-bold text-white">Пройти опрос</Text>
                  </Pressable>
                )}
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function FillView({
  survey,
  onClose,
  onDone,
}: {
  survey: RespondentSurvey;
  onClose: () => void;
  onDone: () => void;
}) {
  const [answers, setAnswers] = React.useState<Record<string, Answer>>({});
  const [saving, setSaving] = React.useState(false);

  function setInt(qid: string, value: number) {
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], valueInt: value } }));
  }
  function setText(qid: string, value: string) {
    setAnswers((p) => ({ ...p, [qid]: { ...p[qid], valueText: value } }));
  }

  async function submit() {
    for (const q of survey.questions) {
      if (!q.required) continue;
      const a = answers[q.id];
      const ok = q.kind === "TEXT" ? a?.valueText?.trim() : a?.valueInt !== undefined;
      if (!ok) {
        Alert.alert("Заполните опрос", "Ответьте на все обязательные вопросы.");
        return;
      }
    }
    setSaving(true);
    try {
      await api(`/surveys/${survey.id}/respond`, {
        method: "POST",
        body: {
          answers: survey.questions
            .map((q) => ({ questionId: q.id, ...answers[q.id] }))
            .filter((a) => a.valueInt !== undefined || (a.valueText && a.valueText.trim())),
        },
      });
      Alert.alert("Спасибо!", "Ваш ответ записан.");
      onDone();
    } catch {
      Alert.alert("Ошибка", "Не удалось отправить ответ.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen padded={false} edges={["top"]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Header title={survey.title} subtitle="Прохождение опроса" onBack={onClose} />

      <ScrollView className="flex-1 px-5" contentContainerStyle={{ paddingVertical: 16 }}>
        {survey.description ? (
          <Text className="text-muted-foreground mb-4 text-sm">{survey.description}</Text>
        ) : null}

        {survey.questions.map((q, idx) => (
          <View key={q.id} className="mb-5">
            <Text className="text-foreground mb-2 text-sm font-semibold">
              {idx + 1}. {q.text}
              {q.required ? <Text className="text-danger"> *</Text> : null}
            </Text>
            <QuestionInput
              question={q}
              value={answers[q.id]}
              onInt={(v) => setInt(q.id, v)}
              onText={(v) => setText(q.id, v)}
            />
          </View>
        ))}

        <Pressable
          onPress={submit}
          disabled={saving}
          className={`mt-2 items-center rounded-lg py-3 ${saving ? "bg-primary-300" : "bg-primary-500"}`}
        >
          <Text className="font-bold text-white">{saving ? "Отправляем…" : "Отправить"}</Text>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function QuestionInput({
  question: q,
  value,
  onInt,
  onText,
}: {
  question: SurveyQuestion;
  value: Answer | undefined;
  onInt: (v: number) => void;
  onText: (v: string) => void;
}) {
  if (q.kind === "SCALE_0_10" || q.kind === "SCALE_1_5") {
    const range =
      q.kind === "SCALE_0_10"
        ? Array.from({ length: 11 }, (_, i) => i)
        : Array.from({ length: 5 }, (_, i) => i + 1);
    return (
      <View className="flex-row flex-wrap gap-1.5">
        {range.map((n) => {
          const active = value?.valueInt === n;
          return (
            <Pressable
              key={n}
              onPress={() => onInt(n)}
              className={`h-10 w-10 items-center justify-center rounded-lg border ${
                active ? "border-primary-500 bg-primary-500" : "border-border bg-card"
              }`}
            >
              <Text className={active ? "font-bold text-white" : "text-foreground"}>{n}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  if (q.kind === "CHOICE") {
    return (
      <View className="gap-1.5">
        {(q.options ?? []).map((opt, idx) => {
          const active = value?.valueInt === idx;
          return (
            <Pressable
              key={idx}
              onPress={() => onInt(idx)}
              className={`flex-row items-center gap-2 rounded-lg border px-3 py-2.5 ${
                active ? "border-primary-500 bg-primary-50" : "border-border bg-card"
              }`}
            >
              <View
                className={`h-4 w-4 rounded-full border-2 ${active ? "border-primary-500 bg-primary-500" : "border-neutral-400"}`}
              />
              <Text className="text-foreground flex-1">{opt}</Text>
            </Pressable>
          );
        })}
      </View>
    );
  }
  return (
    <TextInput
      value={value?.valueText ?? ""}
      onChangeText={onText}
      multiline
      placeholder="Ваш ответ…"
      placeholderTextColor="#9CA3AF"
      className="border-border bg-card text-foreground min-h-[80px] rounded-lg border px-3 py-2 text-sm"
      textAlignVertical="top"
    />
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
