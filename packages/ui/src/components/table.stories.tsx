import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./table";

const meta: Meta = {
  title: "Patterns/Table",
  tags: ["autodocs"],
  parameters: { layout: "padded" },
};
export default meta;

type Story = StoryObj;

const ROWS = [
  { name: "Максим Куликов", role: "OWNER", status: "ACTIVE" as const },
  { name: "Лайло Каримова", role: "HR", status: "ACTIVE" as const },
  { name: "Бахром Хайруллаев", role: "MANAGER", status: "ACTIVE" as const },
  { name: "Анвар Назаров", role: "EMPLOYEE", status: "SUSPENDED" as const },
];

const STATUS_TONE: Record<"ACTIVE" | "SUSPENDED", "success" | "warning"> = {
  ACTIVE: "success",
  SUSPENDED: "warning",
};

export const Basic: Story = {
  render: () => (
    <div className="w-[640px]">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Имя</TableHead>
            <TableHead>Роль</TableHead>
            <TableHead className="text-right">Статус</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {ROWS.map((r) => (
            <TableRow key={r.name}>
              <TableCell className="font-semibold">{r.name}</TableCell>
              <TableCell className="text-muted-foreground">{r.role}</TableCell>
              <TableCell className="text-right">
                <Badge variant={STATUS_TONE[r.status]}>{r.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  ),
};
