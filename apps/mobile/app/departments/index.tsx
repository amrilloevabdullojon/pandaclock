import * as React from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, Stack } from "expo-router";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  CornerDownRight,
  MoreVertical,
  Plus,
} from "lucide-react-native";
import { api } from "@/lib/api-client";
import { Button, Card, Screen } from "@/components/ui";

interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  children: DepartmentNode[];
}

interface FlatItem {
  id: string;
  name: string;
  parentId: string | null;
  depth: number;
  hasChildren: boolean;
}

/**
 * Мобильный экран управления отделами.
 *
 * MVP-набор операций: создать корневой/дочерний, переименовать, переместить
 * (через picker родителя) и удалить. Tree рендерится «плоским» списком FlatList
 * с отступами по depth — это даёт нормальный скролл при сотнях узлов.
 *
 * Drag-drop сознательно опущен — на мобиле UX неудобный, picker эффективнее.
 */
export default function DepartmentsScreen() {
  const [tree, setTree] = React.useState<DepartmentNode[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState<Set<string>>(new Set());
  const [createOpen, setCreateOpen] = React.useState<{ parentId: string | null } | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<FlatItem | null>(null);
  const [reparentTarget, setReparentTarget] = React.useState<FlatItem | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await api<DepartmentNode[]>("/departments/tree");
      setTree(data);
    } catch {
      Alert.alert("Не удалось загрузить отделы");
    }
  }, []);

  React.useEffect(() => {
    setLoading(true);
    void load().finally(() => setLoading(false));
  }, [load]);

  const flat = React.useMemo(() => flattenTree(tree, collapsed), [tree, collapsed]);
  const flatForPicker = React.useMemo(() => flattenTree(tree, new Set()), [tree]);

  function toggle(id: string): void {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function refresh(): Promise<void> {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function openMenu(item: FlatItem): void {
    const actions = [
      "Добавить дочерний отдел",
      "Переименовать",
      "Сменить родителя",
      "Удалить",
      "Отмена",
    ];
    const handle = (idx: number): void => {
      if (idx === 0) setCreateOpen({ parentId: item.id });
      else if (idx === 1) setRenameTarget(item);
      else if (idx === 2) setReparentTarget(item);
      else if (idx === 3) confirmDelete(item);
    };
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: item.name,
          options: actions,
          destructiveButtonIndex: 3,
          cancelButtonIndex: 4,
        },
        handle,
      );
    } else {
      Alert.alert(item.name, undefined, [
        { text: actions[0], onPress: () => handle(0) },
        { text: actions[1], onPress: () => handle(1) },
        { text: actions[2], onPress: () => handle(2) },
        { text: actions[3], style: "destructive", onPress: () => handle(3) },
        { text: actions[4], style: "cancel" },
      ]);
    }
  }

  function confirmDelete(item: FlatItem): void {
    const hasChildren = flatForPicker.some((n) => n.parentId === item.id);
    Alert.alert(
      `Удалить «${item.name}»?`,
      hasChildren
        ? "У отдела есть подразделения — их сначала нужно переместить или удалить."
        : "Действие нельзя отменить. Сотрудники из этого отдела останутся без привязки.",
      [
        { text: "Отмена", style: "cancel" },
        {
          text: "Удалить",
          style: "destructive",
          onPress: async () => {
            try {
              await api(`/departments/${item.id}`, { method: "DELETE" });
              await load();
            } catch (error) {
              Alert.alert(
                "Не удалось удалить",
                error instanceof Error ? error.message : "Попробуйте ещё раз",
              );
            }
          },
        },
      ],
    );
  }

  return (
    <Screen background="default" edges={["bottom"]}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Отделы",
          headerBackTitle: "Назад",
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Создать корневой отдел"
              onPress={() => setCreateOpen({ parentId: null })}
              hitSlop={8}
              className="px-2 py-1"
            >
              <Plus size={22} color="#5B4FE2" />
            </Pressable>
          ),
        }}
      />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#5B4FE2" />
        </View>
      ) : flat.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Building2 size={48} color="#9CA0B0" />
          <Text className="text-foreground mt-4 text-lg font-bold">Пока нет отделов</Text>
          <Text className="text-muted-foreground mt-2 text-center text-sm">
            Создайте первый — например «Разработка» или «Бэк-офис».
          </Text>
          <Button className="mt-5" onPress={() => setCreateOpen({ parentId: null })}>
            Создать отдел
          </Button>
        </View>
      ) : (
        <FlatList
          data={flat}
          keyExtractor={(item) => item.id}
          contentContainerClassName="px-3 py-3 gap-1"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#5B4FE2" />
          }
          renderItem={({ item }) => (
            <NodeRow
              item={item}
              collapsed={collapsed.has(item.id)}
              onToggle={() => toggle(item.id)}
              onMenu={() => openMenu(item)}
            />
          )}
        />
      )}

      {/* === Create dialog === */}
      {createOpen ? (
        <CreateOrRenameSheet
          mode="create"
          parentName={
            createOpen.parentId
              ? (flatForPicker.find((n) => n.id === createOpen.parentId)?.name ?? null)
              : null
          }
          initialName=""
          onClose={() => setCreateOpen(null)}
          onSubmit={async (name) => {
            try {
              await api("/departments", {
                method: "POST",
                body: { name, parentId: createOpen.parentId ?? undefined },
              });
              setCreateOpen(null);
              await load();
              if (createOpen.parentId) {
                setCollapsed((prev) => {
                  const next = new Set(prev);
                  next.delete(createOpen.parentId as string);
                  return next;
                });
              }
            } catch (error) {
              Alert.alert(
                "Не удалось создать",
                error instanceof Error ? error.message : "Попробуйте ещё раз",
              );
            }
          }}
        />
      ) : null}

      {/* === Rename dialog === */}
      {renameTarget ? (
        <CreateOrRenameSheet
          mode="rename"
          parentName={null}
          initialName={renameTarget.name}
          onClose={() => setRenameTarget(null)}
          onSubmit={async (name) => {
            try {
              await api(`/departments/${renameTarget.id}`, {
                method: "PATCH",
                body: { name },
              });
              setRenameTarget(null);
              await load();
            } catch (error) {
              Alert.alert(
                "Не удалось сохранить",
                error instanceof Error ? error.message : "Попробуйте ещё раз",
              );
            }
          }}
        />
      ) : null}

      {/* === Reparent picker === */}
      {reparentTarget ? (
        <ReparentPicker
          target={reparentTarget}
          allNodes={flatForPicker}
          onClose={() => setReparentTarget(null)}
          onPick={async (newParentId) => {
            try {
              await api(`/departments/${reparentTarget.id}`, {
                method: "PATCH",
                body: { parentId: newParentId },
              });
              setReparentTarget(null);
              await load();
            } catch (error) {
              Alert.alert(
                "Не удалось переместить",
                error instanceof Error ? error.message : "Попробуйте ещё раз",
              );
            }
          }}
        />
      ) : null}

      <View className="border-border border-t px-4 pb-4 pt-3">
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Text className="text-muted-foreground text-center text-sm">← Назад</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

function NodeRow({
  item,
  collapsed,
  onToggle,
  onMenu,
}: {
  item: FlatItem;
  collapsed: boolean;
  onToggle: () => void;
  onMenu: () => void;
}) {
  return (
    <Card padding="sm" className="flex-row items-center gap-2">
      <View style={{ width: item.depth * 16 }} />
      {item.hasChildren ? (
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={collapsed ? "Развернуть" : "Свернуть"}
          hitSlop={8}
        >
          {collapsed ? (
            <ChevronRight size={16} color="#9CA0B0" />
          ) : (
            <ChevronDown size={16} color="#9CA0B0" />
          )}
        </Pressable>
      ) : (
        <View className="w-4" />
      )}
      <Building2 size={16} color="#5B4FE2" />
      <Text className="text-foreground flex-1 text-sm font-bold" numberOfLines={1}>
        {item.name}
      </Text>
      <Pressable
        onPress={onMenu}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Действия с отделом"
      >
        <MoreVertical size={18} color="#9CA0B0" />
      </Pressable>
    </Card>
  );
}

/** Универсальный bottom-sheet input для create + rename. */
function CreateOrRenameSheet({
  mode,
  parentName,
  initialName,
  onClose,
  onSubmit,
}: {
  mode: "create" | "rename";
  parentName: string | null;
  initialName: string;
  onClose: () => void;
  onSubmit: (name: string) => Promise<void>;
}) {
  const [name, setName] = React.useState(initialName);
  const [submitting, setSubmitting] = React.useState(false);

  async function handleSubmit() {
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      Alert.alert("Минимум 2 символа");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 items-center justify-end bg-black/50"
    >
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="bg-card w-full rounded-t-2xl p-5 pb-8">
        <Text className="text-foreground text-lg font-extrabold">
          {mode === "create"
            ? parentName
              ? `Новый отдел в «${parentName}»`
              : "Новый отдел"
            : "Переименовать отдел"}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Название"
          placeholderTextColor="#9CA0B0"
          autoFocus
          className="border-border bg-background text-foreground mt-4 rounded-md border px-3 py-3 text-sm"
        />
        <View className="mt-4 flex-row gap-2">
          <Button variant="ghost" fullWidth onPress={onClose}>
            Отмена
          </Button>
          <Button fullWidth onPress={handleSubmit} loading={submitting}>
            {mode === "create" ? "Создать" : "Сохранить"}
          </Button>
        </View>
      </View>
    </View>
  );
}

/** Picker нового родителя — со списком всех отделов, кроме самого узла и его потомков. */
function ReparentPicker({
  target,
  allNodes,
  onClose,
  onPick,
}: {
  target: FlatItem;
  allNodes: FlatItem[];
  onClose: () => void;
  onPick: (parentId: string | null) => Promise<void>;
}) {
  const forbidden = React.useMemo(() => {
    const out = new Set<string>([target.id]);
    let changed = true;
    while (changed) {
      changed = false;
      allNodes.forEach((n) => {
        if (n.parentId && out.has(n.parentId) && !out.has(n.id)) {
          out.add(n.id);
          changed = true;
        }
      });
    }
    return out;
  }, [target.id, allNodes]);

  const options = allNodes.filter((n) => !forbidden.has(n.id));

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 items-center justify-end bg-black/50"
    >
      <Pressable className="absolute inset-0" onPress={onClose} />
      <View className="bg-card max-h-[70%] w-full rounded-t-2xl p-5 pb-8">
        <Text className="text-foreground text-lg font-extrabold">
          Куда переместить «{target.name}»?
        </Text>
        <FlatList
          data={[
            {
              id: "__root__",
              name: "— В корень —",
              parentId: null,
              depth: 0,
              hasChildren: false,
            } as FlatItem,
            ...options,
          ]}
          keyExtractor={(item) => item.id}
          className="mt-3"
          contentContainerClassName="gap-1"
          renderItem={({ item }) => {
            const isRoot = item.id === "__root__";
            const disabled = !isRoot && target.parentId === item.id;
            return (
              <Pressable
                onPress={() => {
                  if (disabled) return;
                  void onPick(isRoot ? null : item.id);
                }}
                disabled={disabled}
                className={`flex-row items-center gap-2 rounded-md p-3 ${
                  disabled ? "opacity-40" : "active:bg-muted"
                }`}
              >
                <View style={{ width: item.depth * 12 }} />
                {!isRoot ? <CornerDownRight size={14} color="#9CA0B0" /> : null}
                <Text className="text-foreground flex-1 text-sm font-semibold">{item.name}</Text>
              </Pressable>
            );
          }}
        />
        <Button variant="ghost" fullWidth onPress={onClose} className="mt-3">
          Отмена
        </Button>
      </View>
    </View>
  );
}

// ===== helpers =====

function flattenTree(nodes: DepartmentNode[], collapsed: Set<string>): FlatItem[] {
  const out: FlatItem[] = [];
  function walk(arr: DepartmentNode[], depth: number): void {
    arr.forEach((n) => {
      out.push({
        id: n.id,
        name: n.name,
        parentId: n.parentId,
        depth,
        hasChildren: n.children.length > 0,
      });
      if (n.children.length > 0 && !collapsed.has(n.id)) {
        walk(n.children, depth + 1);
      }
    });
  }
  walk(nodes, 0);
  return out;
}
