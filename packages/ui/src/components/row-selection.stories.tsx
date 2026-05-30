import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "./button";
import { Checkbox } from "./checkbox";
import { SelectionToolbar, useRowSelection } from "./row-selection";

const meta: Meta = {
  title: "Patterns/RowSelection",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

const ROWS = [
  { id: "1", name: "Максим Куликов", role: "OWNER" },
  { id: "2", name: "Лайло Каримова", role: "HR" },
  { id: "3", name: "Бахром Хайруллаев", role: "MANAGER" },
  { id: "4", name: "Анвар Назаров", role: "EMPLOYEE" },
];

function Demo() {
  const sel = useRowSelection<string>();
  const allIds = ROWS.map((r) => r.id);
  const allSelected = allIds.every((id) => sel.isSelected(id));

  return (
    <div className="w-[480px]">
      <table className="w-full border-collapse text-sm">
        <thead className="border-border bg-muted border-b">
          <tr>
            <th className="w-10 p-3">
              <Checkbox
                checked={allSelected}
                onCheckedChange={() => sel.selectAll(allIds)}
                aria-label="Выбрать все"
              />
            </th>
            <th className="p-3 text-left font-semibold">Имя</th>
            <th className="p-3 text-left font-semibold">Роль</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.id} className="border-border border-b">
              <td className="p-3">
                <Checkbox
                  checked={sel.isSelected(row.id)}
                  onCheckedChange={() => sel.toggle(row.id)}
                  aria-label={`Выбрать ${row.name}`}
                />
              </td>
              <td className="p-3">{row.name}</td>
              <td className="text-muted-foreground p-3">{row.role}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <SelectionToolbar count={sel.count} onClear={sel.clear}>
        <Button variant="ghost" size="sm">
          <Check />
          Одобрить
        </Button>
        <Button variant="ghost" size="sm">
          <Trash2 />
          Удалить
        </Button>
        <Button variant="ghost" size="sm" onClick={sel.clear} aria-label="Сбросить">
          <X />
        </Button>
      </SelectionToolbar>
    </div>
  );
}

export const Default: Story = { render: () => <Demo /> };
