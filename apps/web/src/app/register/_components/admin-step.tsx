"use client";

import { useState } from "react";
import { Button, Input } from "@pandaclock/ui";

export interface AdminData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  agree: boolean;
}

export function AdminStep({
  initial,
  onBack,
  onSubmit,
}: {
  initial: AdminData | null;
  onBack: () => void;
  onSubmit: (data: AdminData) => void;
}) {
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [password, setPassword] = useState(initial?.password ?? "");
  const [agree, setAgree] = useState(initial?.agree ?? false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree || password.length < 8) return;
    onSubmit({ firstName, lastName, email, phone, password, agree });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <header>
        <h1 className="text-2xl font-extrabold text-neutral-900">О вас (администратор)</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Вы будете первым администратором аккаунта.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-700">Имя</label>
          <Input required value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-semibold text-neutral-700">Фамилия</label>
          <Input required value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Email</label>
        <Input
          required
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.uz"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Телефон</label>
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+998 90 123 45 67"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-semibold text-neutral-700">Пароль</label>
        <Input
          required
          type="password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <p className="text-xs text-neutral-400">Минимум 8 символов. Не используйте простые пароли.</p>
      </div>

      <label className="flex items-start gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          required
          className="mt-1"
        />
        <span>
          Я принимаю <a href="/legal/oferta" className="text-primary-500 underline">Оферту</a> и{" "}
          <a href="/legal/privacy" className="text-primary-500 underline">Политику обработки ПД</a>
        </span>
      </label>

      <div className="flex items-center justify-between pt-4">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← Назад
        </Button>
        <Button type="submit" size="lg" disabled={!agree || password.length < 8}>
          Продолжить →
        </Button>
      </div>
    </form>
  );
}
