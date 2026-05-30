import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag } from "./tag";

const TONES = ["neutral", "primary", "success", "warning", "danger", "info", "gold"] as const;

const meta: Meta<typeof Tag> = {
  title: "Primitives/Tag",
  component: Tag,
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "select", options: TONES },
    size: { control: "select", options: ["sm", "md", "lg"] },
    dot: { control: "boolean" },
  },
};
export default meta;

type Story = StoryObj<typeof Tag>;

export const Default: Story = { args: { children: "DRAFT" } };

export const Tones: Story = {
  render: () => (
    <div className="flex flex-wrap items-center gap-2">
      {TONES.map((t) => (
        <Tag key={t} tone={t} dot>
          {t}
        </Tag>
      ))}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Tag size="sm" tone="primary">
        SM
      </Tag>
      <Tag tone="primary">MD</Tag>
      <Tag size="lg" tone="primary">
        LG
      </Tag>
    </div>
  ),
};
