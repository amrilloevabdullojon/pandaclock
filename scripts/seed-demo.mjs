#!/usr/bin/env node
/**
 * Создаёт демо-данные для Pandaclock:
 *   3 tenant'а (IT-студия, ресторан HoReCa, банк),
 *   ~5-7 сотрудников в каждом,
 *   несколько отделов, задач, заявок, рабочих дней,
 *   pre-hashed пароль "demo1234" для всех демо-аккаунтов.
 *
 * Запуск: API должен работать на http://localhost:4000
 *         + Postgres должен быть доступен по DATABASE_URL.
 */
import { Client } from "pg";
import bcrypt from "bcrypt";

const API_BASE = process.env.API_BASE ?? "http://localhost:4000/api/v1";
const DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://pandaclock:dev@localhost:5433/pandaclock?schema=public";
const DEMO_PASSWORD = "demo1234";

const tenants = [
  {
    slug: "cloudit",
    name: "Cloud IT Studio",
    industry: "IT",
    owner: { firstName: "Максим", lastName: "Усманов", email: "maksim@cloudit.uz" },
    extras: [
      { firstName: "Лайло", lastName: "Турдиева", email: "laylo@cloudit.uz", role: "HR", position: "HR-менеджер" },
      { firstName: "Бахром", lastName: "Юлдашев", email: "bakhrom@cloudit.uz", role: "MANAGER", position: "Tech Lead" },
      { firstName: "Анвар", lastName: "Каримов", email: "anvar@cloudit.uz", role: "EMPLOYEE", position: "Senior Frontend" },
      { firstName: "Диана", lastName: "Хан", email: "diana@cloudit.uz", role: "EMPLOYEE", position: "Backend Engineer" },
      { firstName: "Эльдар", lastName: "Сулейман", email: "eldar@cloudit.uz", role: "EMPLOYEE", position: "QA Engineer" },
    ],
    departments: ["Разработка", "QA", "HR"],
  },
  {
    slug: "plov-palace",
    name: "Plov Palace",
    industry: "HORECA",
    owner: { firstName: "Рустам", lastName: "Алиев", email: "rustam@plovpalace.uz" },
    extras: [
      { firstName: "Дильшод", lastName: "Каримов", email: "dilshod@plovpalace.uz", role: "MANAGER", position: "Управляющий" },
      { firstName: "Гульнара", lastName: "Назарова", email: "gulnara@plovpalace.uz", role: "HR", position: "HR" },
      { firstName: "Алишер", lastName: "Худайбергенов", email: "alisher@plovpalace.uz", role: "EMPLOYEE", position: "Шеф-повар" },
      { firstName: "Зарина", lastName: "Тошева", email: "zarina@plovpalace.uz", role: "EMPLOYEE", position: "Официант" },
      { firstName: "Шахзод", lastName: "Эргашев", email: "shahzod@plovpalace.uz", role: "EMPLOYEE", position: "Официант" },
    ],
    departments: ["Кухня", "Зал", "Бар"],
  },
  {
    slug: "uzbank",
    name: "Узбекистан Банк",
    industry: "FINANCE",
    owner: { firstName: "Шерзод", lastName: "Расулов", email: "sherzod@uzbank.uz" },
    extras: [
      { firstName: "Малика", lastName: "Юсупова", email: "malika@uzbank.uz", role: "HR", position: "Директор HR" },
      { firstName: "Камол", lastName: "Икромов", email: "kamol@uzbank.uz", role: "MANAGER", position: "Начальник кредитного отдела" },
      { firstName: "Нозима", lastName: "Махмудова", email: "nozima@uzbank.uz", role: "EMPLOYEE", position: "Кредитный специалист" },
      { firstName: "Тимур", lastName: "Алимов", email: "timur@uzbank.uz", role: "EMPLOYEE", position: "Аналитик" },
    ],
    departments: ["Кредитный отдел", "Аналитика", "Безопасность", "HR"],
  },
];

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

async function ensureTenant(tenant, pgClient) {
  const slug = tenant.slug;
  // если уже создан — переиспользуем
  const existing = await pgClient.query("SELECT id, schema_name FROM tenants WHERE slug = $1", [slug]);
  if (existing.rowCount > 0) {
    console.warn(`  ↻ ${slug} уже существует, пропускаю register-company`);
    return existing.rows[0];
  }

  const res = await postJson("/auth/register-company", {
    companyName: tenant.name,
    slug,
    industry: tenant.industry,
    adminFirstName: tenant.owner.firstName,
    adminLastName: tenant.owner.lastName,
    adminEmail: tenant.owner.email,
    adminPassword: DEMO_PASSWORD,
  });
  if (res.status !== 201) {
    throw new Error(`register-company ${slug} failed: ${res.status} ${JSON.stringify(res.data)}`);
  }
  console.warn(`  ✓ ${slug} (${tenant.industry}) создан`);
  return { id: res.data.tenant.id, schema_name: `tenant_${slug}` };
}

async function seedTenantInternals(tenant, schemaName, passwordHash, pgClient) {
  await pgClient.query(`SET search_path TO "${schemaName}", public`);

  // Departments — manual upsert (нет UNIQUE constraint на name → ON CONFLICT не сработает)
  const deptIds = {};
  for (const name of tenant.departments) {
    const existing = await pgClient.query(
      "SELECT id FROM departments WHERE name = $1::text LIMIT 1",
      [name],
    );
    if (existing.rowCount > 0) {
      deptIds[name] = existing.rows[0].id;
      continue;
    }
    const r = await pgClient.query(
      `INSERT INTO departments (name) VALUES ($1::text) RETURNING id`,
      [name],
    );
    deptIds[name] = r.rows[0].id;
  }

  // Extra users — без ON CONFLICT DO UPDATE (pg ругается на смену типов в plan cache)
  const userIds = [];
  const firstDeptId = Object.values(deptIds)[0] ?? null;
  for (const u of tenant.extras) {
    const email = u.email.toLowerCase();
    // upsert вручную: сначала пробуем найти, если нет — insert
    const existing = await pgClient.query("SELECT id FROM users WHERE email = $1::text LIMIT 1", [email]);
    if (existing.rowCount > 0) {
      userIds.push({ id: existing.rows[0].id, ...u });
      continue;
    }
    const r = await pgClient.query(
      `INSERT INTO users (email, password_hash, first_name, last_name, role, status, position, department_id, hire_date, pd_consent_at, email_verified_at)
       VALUES ($1::text, $2::text, $3::text, $4::text, $5::text, 'ACTIVE', $6::text, $7::uuid,
               CURRENT_DATE - INTERVAL '180 days', NOW(), NOW())
       RETURNING id`,
      [email, passwordHash, u.firstName, u.lastName, u.role, u.position, firstDeptId],
    );
    userIds.push({ id: r.rows[0].id, ...u });
  }

  // Также назначим owner-у hire_date
  await pgClient.query(
    `UPDATE users SET hire_date = CURRENT_DATE - INTERVAL '365 days', email_verified_at = NOW()
     WHERE email = $1`,
    [tenant.owner.email.toLowerCase()],
  );

  // Time entries: history за последние 5 рабочих дней для каждого extra user
  for (const u of userIds) {
    for (let dayOffset = 1; dayOffset <= 5; dayOffset += 1) {
      const isLate = Math.random() < 0.2;
      const totalMin = 480 - Math.floor(Math.random() * 30);
      const day = new Date();
      day.setDate(day.getDate() - dayOffset);
      const dayIso = day.toISOString().slice(0, 10);
      const startMinute = isLate ? 20 : 0;
      const startIso = `${dayIso}T0${9 + Math.floor(startMinute / 60)}:${String(startMinute % 60).padStart(2, "0")}:00Z`;
      const finishIso = `${dayIso}T18:00:00Z`;
      await pgClient.query(
        `INSERT INTO time_entries (user_id, date, started_at, finished_at, status, total_minutes, breaks_total_minutes, is_late)
         VALUES ($1::uuid, $2::date, $3::timestamptz, $4::timestamptz, 'FINISHED', $5::int, 60, $6::bool)
         ON CONFLICT (user_id, date) DO NOTHING`,
        [u.id, dayIso, startIso, finishIso, totalMin, isLate],
      );
    }
  }

  // Несколько задач, разные статусы
  const ownerId = (await pgClient.query("SELECT id FROM users WHERE email = $1", [tenant.owner.email.toLowerCase()])).rows[0].id;
  const taskTitles = [
    { title: "Подготовить отчёт по продажам за май", priority: "HIGH", status: "IN_PROGRESS" },
    { title: "Согласовать договор с поставщиком", priority: "URGENT", status: "NEW" },
    { title: "Обновить раздел \"О компании\" на сайте", priority: "LOW", status: "DONE" },
    { title: "Провести 1:1 с командой", priority: "MEDIUM", status: "NEW" },
    { title: "Закрыть техдолг по логированию", priority: "MEDIUM", status: "IN_PROGRESS" },
  ];
  const assignees = [ownerId, ...userIds.map((u) => u.id)];
  for (const t of taskTitles) {
    const assignee = assignees[Math.floor(Math.random() * assignees.length)];
    await pgClient.query(
      `INSERT INTO tasks (title, status, priority, created_by_id, assignee_id, deadline, labels, completed_at)
       VALUES ($1::text, $2::text, $3::text, $4::uuid, $5::uuid,
               NOW() + INTERVAL '7 days', ARRAY['demo']::text[],
               CASE WHEN $2::text = 'DONE' THEN NOW() ELSE NULL END)`,
      [t.title, t.status, t.priority, ownerId, assignee],
    );
  }

  // Заявка на отпуск (одна на тестового сотрудника)
  if (userIds[0]) {
    await pgClient.query(
      `INSERT INTO leave_requests (user_id, type, start_date, end_date, days_count, reason, status)
       VALUES ($1::uuid, 'VACATION', CURRENT_DATE + INTERVAL '14 days', CURRENT_DATE + INTERVAL '18 days', 5, 'Отпуск с семьёй', 'PENDING')`,
      [userIds[0].id],
    );
  }

  // Демо-данные модулей фаз 13–18 (найм, опросы, активы, обучение, командировки, payroll).
  await seedNewModules(pgClient, { ownerId, userIds, firstDeptId });
}

const SALARY_BY_ROLE = {
  OWNER: 25_000_000,
  ADMIN: 18_000_000,
  HR: 12_000_000,
  MANAGER: 15_000_000,
  EMPLOYEE: 8_000_000,
};

/** Сеет демо-данные новых модулей. Идемпотентно (skip если уже есть) и
 *  устойчиво к старым tenant'ам без новых таблиц (warn вместо падения). */
async function seedNewModules(pg, { ownerId, userIds, firstDeptId }) {
  try {
    const already = await pg.query("SELECT 1 FROM surveys LIMIT 1");
    if (already.rowCount > 0) return;
    const u0 = userIds[0]?.id ?? ownerId;
    const u1 = userIds[1]?.id ?? ownerId;

    // ── Найм / ATS ──
    const vac = await pg.query(
      `INSERT INTO vacancies (title, department_id, description, status, created_by)
       VALUES ('Frontend-разработчик', $1::uuid, 'Ищем сильного фронтендера в команду', 'OPEN', $2::uuid)
       RETURNING id`,
      [firstDeptId, ownerId],
    );
    const vacId = vac.rows[0].id;
    const candidates = [
      ["Иван Петров", "ivan.petrov@example.com", "NEW", 4],
      ["Сара Ким", "sara.kim@example.com", "INTERVIEW", 5],
      ["Олег Сидоров", null, "REJECTED", 2],
    ];
    for (const [name, email, stage, rating] of candidates) {
      await pg.query(
        `INSERT INTO candidates (vacancy_id, full_name, email, source, stage, rating)
         VALUES ($1::uuid, $2::text, $3, 'hh.uz', $4::text, $5::int)`,
        [vacId, name, email, stage, rating],
      );
    }

    // ── Опросы / eNPS (активный) ──
    const sv = await pg.query(
      `INSERT INTO surveys (title, description, type, status, anonymous, created_by)
       VALUES ('Пульс-опрос Q2', 'Как настроение в команде?', 'ENPS', 'ACTIVE', true, $1::uuid)
       RETURNING id`,
      [ownerId],
    );
    const svId = sv.rows[0].id;
    const q1 = await pg.query(
      `INSERT INTO survey_questions (survey_id, text, kind, sort_order, required)
       VALUES ($1::uuid, 'Насколько вероятно, что вы порекомендуете нас как место работы?', 'SCALE_0_10', 0, true) RETURNING id`,
      [svId],
    );
    const q2 = await pg.query(
      `INSERT INTO survey_questions (survey_id, text, kind, sort_order, required)
       VALUES ($1::uuid, 'Оцените баланс работы и отдыха', 'SCALE_1_5', 1, true) RETURNING id`,
      [svId],
    );
    const q3 = await pg.query(
      `INSERT INTO survey_questions (survey_id, text, kind, sort_order, required)
       VALUES ($1::uuid, 'Что бы вы улучшили?', 'TEXT', 2, false) RETURNING id`,
      [svId],
    );
    // Пара ответов, чтобы результаты были не пустыми (от owner и второго сотрудника).
    for (const [uid, scale10, scale5, text] of [
      [ownerId, 9, 4, "Больше тимбилдингов"],
      [u1, 6, 3, "Гибкий график"],
    ]) {
      const resp = await pg.query(
        `INSERT INTO survey_responses (survey_id, user_id) VALUES ($1::uuid, $2::uuid)
         ON CONFLICT (survey_id, user_id) DO NOTHING RETURNING id`,
        [svId, uid],
      );
      if (resp.rowCount === 0) continue;
      const respId = resp.rows[0].id;
      await pg.query(
        `INSERT INTO survey_answers (response_id, question_id, value_int) VALUES ($1::uuid, $2::uuid, $3::int)`,
        [respId, q1.rows[0].id, scale10],
      );
      await pg.query(
        `INSERT INTO survey_answers (response_id, question_id, value_int) VALUES ($1::uuid, $2::uuid, $3::int)`,
        [respId, q2.rows[0].id, scale5],
      );
      await pg.query(
        `INSERT INTO survey_answers (response_id, question_id, value_text) VALUES ($1::uuid, $2::uuid, $3::text)`,
        [respId, q3.rows[0].id, text],
      );
    }

    // ── Активы ──
    const asset = await pg.query(
      `INSERT INTO assets (name, category, serial_number, status, assigned_to, cost, currency)
       VALUES ('MacBook Pro 14', 'LAPTOP', 'C02DEMO0001', 'ASSIGNED', $1::uuid, 25000000, 'UZS') RETURNING id`,
      [u0],
    );
    await pg.query(
      `INSERT INTO asset_assignments (asset_id, user_id, assigned_by, note)
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'Выдан при приёме')`,
      [asset.rows[0].id, u0, ownerId],
    );
    await pg.query(
      `INSERT INTO assets (name, category, serial_number, status, cost, currency)
       VALUES ('Монитор Dell 27"', 'MONITOR', 'DELLDEMO0002', 'AVAILABLE', 4000000, 'UZS')`,
    );

    // ── База знаний / LMS ──
    await pg.query(
      `INSERT INTO kb_articles (title, content, category, published, created_by)
       VALUES ('Как оформить отпуск',
               'Подайте заявку в разделе «Заявки» минимум за 14 дней. Руководитель согласует её, и дни спишутся с вашего баланса.',
               'HR', true, $1::uuid)`,
      [ownerId],
    );
    const course = await pg.query(
      `INSERT INTO courses (title, description, status, created_by)
       VALUES ('Введение в компанию', 'Онбординг-курс для новых сотрудников', 'PUBLISHED', $1::uuid) RETURNING id`,
      [ownerId],
    );
    const courseId = course.rows[0].id;
    const lesson1 = await pg.query(
      `INSERT INTO course_lessons (course_id, title, content, sort_order)
       VALUES ($1::uuid, 'Добро пожаловать', 'Рады видеть вас в команде! В этом уроке — о нашей миссии.', 0) RETURNING id`,
      [courseId],
    );
    await pg.query(
      `INSERT INTO course_lessons (course_id, title, content, sort_order)
       VALUES ($1::uuid, 'Наши ценности', 'Открытость, забота о клиенте и постоянное развитие.', 1)`,
      [courseId],
    );
    const enr = await pg.query(
      `INSERT INTO course_enrollments (course_id, user_id) VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (course_id, user_id) DO NOTHING RETURNING id`,
      [courseId, u0],
    );
    if (enr.rowCount > 0) {
      await pg.query(
        `INSERT INTO lesson_completions (enrollment_id, lesson_id) VALUES ($1::uuid, $2::uuid)`,
        [enr.rows[0].id, lesson1.rows[0].id],
      );
    }

    // ── Командировки / расходы ──
    const trip = await pg.query(
      `INSERT INTO business_trips (user_id, destination, purpose, start_date, end_date, status)
       VALUES ($1::uuid, 'Москва, конференция', 'Участие в отраслевой конференции',
               CURRENT_DATE + INTERVAL '7 days', CURRENT_DATE + INTERVAL '10 days', 'SUBMITTED') RETURNING id`,
      [u0],
    );
    await pg.query(
      `INSERT INTO expenses (user_id, trip_id, category, amount, currency, description, spent_at, status)
       VALUES ($1::uuid, $2::uuid, 'TRAVEL', 1500000, 'UZS', 'Авиабилеты', CURRENT_DATE + INTERVAL '7 days', 'PENDING')`,
      [u0, trip.rows[0].id],
    );

    // ── Payroll: оклады всем + один выплаченный период ──
    const everyone = await pg.query(`SELECT id, role FROM users WHERE status = 'ACTIVE'`);
    for (const person of everyone.rows) {
      const amount = SALARY_BY_ROLE[person.role] ?? SALARY_BY_ROLE.EMPLOYEE;
      await pg.query(
        `INSERT INTO salaries (user_id, amount, currency, effective_from, created_by)
         VALUES ($1::uuid, $2::numeric, 'UZS', CURRENT_DATE - INTERVAL '30 days', $3::uuid)`,
        [person.id, amount, ownerId],
      );
    }
    const run = await pg.query(
      `INSERT INTO payroll_runs (period, status, created_by, paid_at)
       VALUES ('Май 2026', 'PAID', $1::uuid, NOW()) RETURNING id`,
      [ownerId],
    );
    await pg.query(
      `INSERT INTO payslips (run_id, user_id, base_amount, net_amount, currency)
       SELECT $1::uuid, s.user_id, s.amount, s.amount, s.currency
       FROM (
         SELECT DISTINCT ON (user_id) user_id, amount, currency
         FROM salaries WHERE effective_from <= CURRENT_DATE
         ORDER BY user_id, effective_from DESC
       ) s
       JOIN users u ON u.id = s.user_id AND u.status = 'ACTIVE'`,
      [run.rows[0].id],
    );
  } catch (err) {
    console.warn(`  ⚠️  пропускаю демо новых модулей: ${err.message}`);
  }
}

async function main() {
  console.warn("🐼 Seeding Pandaclock demo data...");
  console.warn(`   API_BASE     = ${API_BASE}`);
  console.warn(`   DATABASE_URL = ${DATABASE_URL.replace(/:[^:@]+@/, ":***@")}`);

  // hash 1 раз — bcrypt с rounds=10
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const pg = new Client({ connectionString: DATABASE_URL });
  await pg.connect();
  console.warn("✓ Connected to Postgres");

  try {
    for (const tenant of tenants) {
      console.warn(`\n▸ ${tenant.name} [${tenant.slug}]`);
      const created = await ensureTenant(tenant, pg);
      await seedTenantInternals(tenant, created.schema_name, passwordHash, pg);
      console.warn(`  ✓ ${tenant.departments.length} отделов, ${tenant.extras.length + 1} пользователей, 5 задач, заявка на отпуск, 5 дней истории`);
      console.warn(`    + вакансия+кандидаты, активный eNPS-опрос, активы, курс+статья, командировка, оклады+ведомость`);
    }

    console.warn("\n═════════════════════════════════════════════════");
    console.warn("DEMO АККАУНТЫ — пароль для всех: " + DEMO_PASSWORD);
    console.warn("═════════════════════════════════════════════════");
    for (const t of tenants) {
      console.warn(`\n  ${t.name} (X-Tenant-Slug: ${t.slug})`);
      console.warn(`    OWNER  ${t.owner.email}`);
      for (const u of t.extras) {
        console.warn(`    ${u.role.padEnd(7)} ${u.email}  · ${u.position}`);
      }
    }
    console.warn("\nГотово.");
  } finally {
    await pg.end();
  }
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
