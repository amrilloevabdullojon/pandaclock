import { describe, expect, it } from "vitest";
import { buildTree, type DepartmentRow } from "./departments.service.js";

const row = (id: string, name: string, parentId: string | null = null): DepartmentRow => ({
  id,
  name,
  parent_id: parentId,
  head_id: null,
  description: null,
  created_at: new Date(),
  updated_at: new Date(),
});

describe("buildTree", () => {
  it("returns a flat list as roots when no parents", () => {
    const tree = buildTree([row("a", "A"), row("b", "B")]);
    expect(tree).toHaveLength(2);
    expect(tree[0]?.children).toEqual([]);
  });

  it("nests children under parents", () => {
    const tree = buildTree([
      row("a", "A"),
      row("b", "B", "a"),
      row("c", "C", "b"),
      row("d", "D"),
    ]);
    expect(tree).toHaveLength(2);
    const a = tree.find((n) => n.id === "a");
    expect(a?.children[0]?.id).toBe("b");
    expect(a?.children[0]?.children[0]?.id).toBe("c");
  });

  it("falls back to root when parent_id points to missing node", () => {
    const tree = buildTree([row("a", "A", "missing")]);
    expect(tree).toHaveLength(1);
    expect(tree[0]?.id).toBe("a");
  });
});
