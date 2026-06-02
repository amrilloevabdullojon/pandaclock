"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Building2, ChevronDown, ChevronRight, GripVertical, Pencil, Trash2 } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  toast,
} from "@pandaclock/ui";

export interface DepartmentNode {
  id: string;
  name: string;
  parentId: string | null;
  headId: string | null;
  description: string | null;
  children: DepartmentNode[];
}

interface Props {
  initialTree: DepartmentNode[];
}

const ROOT_DROP_ID = "__root__";

/**
 * Drag-drop tree отделов:
 *  - Каждый узел можно потащить за «ручку» и бросить на другой узел → станет его child.
 *  - В самом верху есть «корневая» drop-зона — бросить туда = вынести в корень.
 *  - Защита от циклов: drop запрещён на самого себя и на своих потомков (визуально подсвечивается).
 *  - Inline rename + delete доступны через action-кнопки справа.
 *
 * Состояние tree хранится локально и обновляется оптимистично; при ошибке откатывается и
 * router.refresh() перезагружает данные с сервера.
 */
export function DepartmentsTree({ initialTree }: Props) {
  const router = useRouter();
  const [tree, setTree] = React.useState<DepartmentNode[]>(initialTree);
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [renameTarget, setRenameTarget] = React.useState<DepartmentNode | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<DepartmentNode | null>(null);

  // Обновляем локальное состояние, если сервер прислал свежее дерево (router.refresh).
  React.useEffect(() => {
    setTree(initialTree);
  }, [initialTree]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Чтобы клики на action-кнопках не активировали drag.
      activationConstraint: { distance: 5 },
    }),
  );

  const flatById = React.useMemo(() => flattenById(tree), [tree]);
  const activeNode = activeId ? (flatById.get(activeId) ?? null) : null;
  const forbiddenDropIds = React.useMemo(() => {
    if (!activeNode) return new Set<string>();
    return collectSelfAndDescendants(activeNode);
  }, [activeNode]);

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent): Promise<void> {
    const fromId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : null;
    setActiveId(null);
    if (!overId) return;
    if (forbiddenDropIds.has(overId)) return;

    const newParentId = overId === ROOT_DROP_ID ? null : overId;
    const moving = flatById.get(fromId);
    if (!moving) return;
    if (moving.parentId === newParentId) return;

    // Оптимистичное обновление.
    const previous = tree;
    setTree((current) => reparent(current, fromId, newParentId));

    try {
      const response = await fetch(`/api/departments/${fromId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentId: newParentId }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { code?: string };
        if (body.code === "CANNOT_PARENT_DESCENDANT") {
          toast.error("Нельзя сделать дочерним для своего же потомка");
        } else if (body.code === "CANNOT_PARENT_SELF") {
          toast.error("Нельзя сделать отдел дочерним для самого себя");
        } else {
          toast.error("Не удалось переместить отдел");
        }
        setTree(previous);
        return;
      }
      toast.success(`«${moving.name}» перенесён`);
      router.refresh();
    } catch {
      toast.error("Нет связи с сервером");
      setTree(previous);
    }
  }

  async function handleRename(node: DepartmentNode, newName: string): Promise<void> {
    const trimmed = newName.trim();
    if (trimmed.length < 2) {
      toast.error("Минимум 2 символа");
      return;
    }
    if (trimmed === node.name) {
      setRenameTarget(null);
      return;
    }
    try {
      const response = await fetch(`/api/departments/${node.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        toast.error("Не удалось переименовать");
        return;
      }
      toast.success("Сохранено");
      setRenameTarget(null);
      router.refresh();
    } catch {
      toast.error("Нет связи с сервером");
    }
  }

  async function handleDelete(node: DepartmentNode): Promise<void> {
    try {
      const response = await fetch(`/api/departments/${node.id}`, {
        method: "DELETE",
      });
      if (response.status === 204) {
        toast.success(`«${node.name}» удалён`);
        setDeleteTarget(null);
        router.refresh();
        return;
      }
      const body = (await response.json().catch(() => ({}))) as { message?: string };
      toast.error(body.message ?? "Не удалось удалить");
    } catch {
      toast.error("Нет связи с сервером");
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="space-y-2">
        <RootDropZone active={!!activeId} forbidden={forbiddenDropIds.has(ROOT_DROP_ID)} />
        <TreeList
          nodes={tree}
          depth={0}
          activeId={activeId}
          forbiddenDropIds={forbiddenDropIds}
          onRename={setRenameTarget}
          onDelete={setDeleteTarget}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeNode ? (
          <div className="border-primary-500 bg-card flex items-center gap-2 rounded-md border-2 px-3 py-2 shadow-lg">
            <Building2 className="text-primary-500 h-4 w-4" />
            <span className="text-foreground text-sm font-semibold">{activeNode.name}</span>
          </div>
        ) : null}
      </DragOverlay>

      {/* Rename dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => !open && setRenameTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Переименовать отдел</DialogTitle>
          </DialogHeader>
          {renameTarget ? (
            <RenameForm
              key={renameTarget.id}
              initial={renameTarget.name}
              onCancel={() => setRenameTarget(null)}
              onSubmit={(name) => handleRename(renameTarget, name)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Удалить «{deleteTarget?.name}»?</DialogTitle>
            <DialogDescription>
              {deleteTarget && deleteTarget.children.length > 0
                ? "У отдела есть подразделения — их сначала нужно переместить или удалить."
                : "Действие нельзя отменить. Сотрудники из этого отдела останутся, но без привязки."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Отмена
            </Button>
            <Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>
              Удалить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}

function TreeList({
  nodes,
  depth,
  activeId,
  forbiddenDropIds,
  onRename,
  onDelete,
}: {
  nodes: DepartmentNode[];
  depth: number;
  activeId: string | null;
  forbiddenDropIds: Set<string>;
  onRename: (n: DepartmentNode) => void;
  onDelete: (n: DepartmentNode) => void;
}) {
  return (
    <ul className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          depth={depth}
          activeId={activeId}
          forbiddenDropIds={forbiddenDropIds}
          onRename={onRename}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
}

function TreeNodeItem({
  node,
  depth,
  activeId,
  forbiddenDropIds,
  onRename,
  onDelete,
}: {
  node: DepartmentNode;
  depth: number;
  activeId: string | null;
  forbiddenDropIds: Set<string>;
  onRename: (n: DepartmentNode) => void;
  onDelete: (n: DepartmentNode) => void;
}) {
  const [expanded, setExpanded] = React.useState(true);
  const isForbidden = forbiddenDropIds.has(node.id);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: node.id,
  });
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: node.id,
    disabled: isForbidden,
  });

  const hasChildren = node.children.length > 0;
  const showAsDropTarget = !!activeId && activeId !== node.id;

  return (
    <li>
      <div
        ref={setDropRef}
        style={{ marginLeft: depth * 20 }}
        className={cls(
          "group flex items-center gap-2 rounded-md border px-2 py-2 transition-colors",
          isOver && !isForbidden
            ? "border-primary-500 bg-primary-50"
            : "bg-muted border-transparent",
          showAsDropTarget && isForbidden ? "opacity-40" : "",
          isDragging ? "opacity-30" : "",
        )}
      >
        {/* Drag handle */}
        <button
          ref={setDragRef}
          {...listeners}
          {...attributes}
          aria-label={`Перетащить «${node.name}»`}
          className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Expand / collapse */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Свернуть" : "Развернуть"}
            className="text-muted-foreground hover:text-foreground"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="h-4 w-4" />
        )}

        <Building2 className="text-primary-500 h-4 w-4 shrink-0" />
        <span className="text-foreground flex-1 truncate text-sm font-semibold">{node.name}</span>
        {node.description ? (
          <span className="text-muted-foreground hidden truncate text-xs md:inline">
            {node.description}
          </span>
        ) : null}
        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onRename(node)}
            aria-label="Переименовать"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => onDelete(node)}
            aria-label="Удалить"
            className="text-danger hover:text-danger"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {hasChildren && expanded ? (
        <div className="mt-1">
          <TreeList
            nodes={node.children}
            depth={depth + 1}
            activeId={activeId}
            forbiddenDropIds={forbiddenDropIds}
            onRename={onRename}
            onDelete={onDelete}
          />
        </div>
      ) : null}
    </li>
  );
}

function RootDropZone({ active, forbidden }: { active: boolean; forbidden: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: ROOT_DROP_ID, disabled: forbidden });
  if (!active) return null;
  return (
    <div
      ref={setNodeRef}
      className={cls(
        "rounded-md border-2 border-dashed px-3 py-3 text-center text-xs font-semibold transition-colors",
        isOver
          ? "border-primary-500 bg-primary-50 text-primary-700"
          : "border-border text-muted-foreground",
        forbidden ? "opacity-40" : "",
      )}
    >
      Перетащите сюда, чтобы сделать корневым
    </div>
  );
}

function RenameForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial: string;
  onSubmit: (name: string) => void;
  onCancel: () => void;
}) {
  const [name, setName] = React.useState(initial);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(name);
      }}
      className="space-y-4"
    >
      <div className="space-y-2">
        <Label htmlFor="rename-name">Название</Label>
        <Input
          id="rename-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          Отмена
        </Button>
        <Button type="submit">Сохранить</Button>
      </DialogFooter>
    </form>
  );
}

// ===== helpers =====

function flattenById(nodes: DepartmentNode[]): Map<string, DepartmentNode> {
  const map = new Map<string, DepartmentNode>();
  function walk(arr: DepartmentNode[]): void {
    arr.forEach((n) => {
      map.set(n.id, n);
      if (n.children.length) walk(n.children);
    });
  }
  walk(nodes);
  return map;
}

function collectSelfAndDescendants(node: DepartmentNode): Set<string> {
  const out = new Set<string>();
  function walk(n: DepartmentNode): void {
    out.add(n.id);
    n.children.forEach(walk);
  }
  walk(node);
  return out;
}

/** Перенести узел `id` в `newParentId` (или в корень при null). Чистая иммутабельная операция. */
function reparent(
  tree: DepartmentNode[],
  id: string,
  newParentId: string | null,
): DepartmentNode[] {
  let extracted: DepartmentNode | null = null;

  function strip(nodes: DepartmentNode[]): DepartmentNode[] {
    const out: DepartmentNode[] = [];
    nodes.forEach((n) => {
      if (n.id === id) {
        extracted = n;
        return;
      }
      out.push({ ...n, children: strip(n.children) });
    });
    return out;
  }
  const stripped = strip(tree);
  if (!extracted) return tree;
  const updated: DepartmentNode = { ...(extracted as DepartmentNode), parentId: newParentId };

  if (newParentId === null) {
    return [...stripped, updated];
  }
  function insert(nodes: DepartmentNode[]): DepartmentNode[] {
    return nodes.map((n) => {
      if (n.id === newParentId) {
        return { ...n, children: [...n.children, updated] };
      }
      return { ...n, children: insert(n.children) };
    });
  }
  return insert(stripped);
}

function cls(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}
