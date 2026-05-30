import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { EditableField } from "./editable-field";

const meta: Meta<typeof EditableField> = {
  title: "Patterns/EditableField",
  component: EditableField,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof EditableField>;

function Demo({
  initial,
  ...rest
}: { initial: string } & Partial<React.ComponentProps<typeof EditableField>>) {
  const [value, setValue] = React.useState(initial);
  return (
    <div className="w-72">
      <EditableField
        value={value}
        onSave={async (next) => {
          // имитируем задержку API
          await new Promise((r) => setTimeout(r, 400));
          setValue(next);
        }}
        ariaLabel="поле"
        {...rest}
      />
      <p className="text-muted-foreground mt-3 text-xs">Текущее: «{value}»</p>
    </div>
  );
}

export const Single: Story = {
  render: () => <Demo initial="Бахром Хайруллаев" />,
};

export const Multi: Story = {
  render: () => (
    <Demo
      initial="Senior backend engineer, ответственный за биллинг и интеграции."
      variant="multi"
    />
  ),
};

export const Required: Story = {
  render: () => <Demo initial="Anvar" required />,
};

export const WithValidation: Story = {
  render: () => (
    <Demo
      initial="+998 90 123 45 67"
      validate={(v) => (/^[+0-9\s\-()]{4,20}$/.test(v) ? null : "Похоже на не-телефон")}
    />
  ),
};
