import type { Meta, StoryObj } from "@storybook/react-vite";
import { Badge } from "./badge";

const VARIANTS = [
  "default",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
  "gold",
  "outline",
] as const;

const meta: Meta<typeof Badge> = {
  title: "Primitives/Badge",
  component: Badge,
  tags: ["autodocs"],
  argTypes: {
    variant: { control: "select", options: VARIANTS },
    dot: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Badge>;

export const Default: Story = { args: { children: "ACTIVE" } };
export const WithDot: Story = { args: { children: "Online", dot: true, variant: "success" } };

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {VARIANTS.map((v) => (
        <Badge key={v} variant={v}>
          {v}
        </Badge>
      ))}
    </div>
  ),
};

export const Removable: Story = {
  render: () => (
    <Badge variant="secondary" onRemove={() => alert("removed")}>
      Filter: HR
    </Badge>
  ),
};
