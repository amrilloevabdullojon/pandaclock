# Публичные UI-референсы и Figma-шаблоны
## Для HR/CRM SaaS-проекта

**Версия:** 1.0
**Дата:** 2026-05-24

---

## Зачем нужны референсы

Использовать готовые Figma-шаблоны как:
1. **Источник вдохновения** — что вообще бывает в HR-системах
2. **Основу для собственного дизайна** — копируем структуру, меняем под бренд
3. **Каталог решений** — как разные команды решают типовые задачи (учёт времени, заявки, отчёты)

⚠️ **Важно:** не копировать готовый шаблон 1-в-1 — это даст "стандартный" вид, который видели все. Брать структуру + переделывать под свой бренд.

---

## 1. Web-дашборд (для руководителей, HR, админов)

### 🥇 Топ рекомендация: SmartHR
- **Ссылка:** [SmartHR - Free Figma UI Kit for HRM & Employee Management](https://www.figma.com/community/file/1539212751721531783/smarthr-free-figma-ui-kit-for-hrm-employee-management)
- **Почему:** покрывает HRM + payroll + employee management, идёт сразу с реализациями на HTML/React/Vue/Angular/Laravel
- **Что взять:** структура навигации, карточки сотрудников, дашборды
- **Минус:** дизайн "average", нужна доработка под свой бренд

### 🥈 HRDashboard UI Kit (250+ экранов)
- **Ссылка:** [HRDashboard - HR Management Dashboard UI Kit](https://www.figma.com/community/file/1460297082068217556/hrdashboard-hr-management-dashboard-ui-kit)
- **Почему:** огромный каталог — есть light/dark themes, много кейсов
- **Что взять:** компоненты, формы, таблицы (база для shadcn/ui кастомизации)

### 🥉 PagedOne HR Dashboard (Tailwind-based)
- **Ссылка:** [HR Managment Dashboard Figma and Tailwind CSS Template](https://pagedone.io/templates/hr-managment-dashboard)
- **Почему:** уже на Tailwind — наш стек!
- **Что взять:** 15+ страниц (посещаемость, календарь, отпуска, payroll, уведомления) — структура очень близка к нашему ТЗ
- **Бонус:** Tailwind-разметка уже готова, можно копировать в Next.js

### Дополнительно к рассмотрению
- [HR Management System](https://www.figma.com/community/file/1242583535658781138/hr-management-system) — более детальный
- [HR Management Admin UI Kit](https://www.figma.com/community/file/1321141129752993757/hr-management-admin-ui-kit)
- [Admin and Employee Dashboard (B2B Leave Management)](https://www.figma.com/community/file/1310164944628781801/admin-and-employee-dashboard) — фокус на заявках/отпусках
- [HR Dashboard Responsive](https://www.figma.com/community/file/1044488229366944066/hr-dashboard-responsive)
- [HRMS High-Fidelity (login + admin + user UI)](https://www.figma.com/community/file/1426513940538134397/hrmshuman-resource-management-system-employee-mnagement-system-high-fidelity)
- [Все HR Management шаблоны на Figma Community](https://www.figma.com/community/tag/hr%20management/files)

---

## 2. Mobile-приложение (для сотрудников)

### 🥇 Топ рекомендация: Attendance app
- **Ссылка:** [Attendance app](https://www.figma.com/community/file/1525745998552462934/attendance-app)
- **Почему:** именно наш кейс — clock-in/out с GPS, real-time attendance
- **Что взять:** UX для основной кнопки "Начать день", экран геолокации, история отметок

### 🥈 Trackzyn — Task & Time Tracker
- **Ссылка:** [Trackzyn – Task & Time Tracker Mobile App UI Kit](https://www.figma.com/community/file/1504339203970424161/trackzyn-task-time-tracker-mobile-app-ui-kit)
- **Почему:** 60+ экранов task management + time tracking — закрывает обе важные функции сотрудника
- **Что взять:** UI задач, таймер, ежедневные отчёты

### 🥉 Timesheet UI
- **Ссылка:** [Timesheet UI](https://www.figma.com/community/file/1430079725676301369/timesheet-ui)
- **Почему:** Daily/Weekly/Monthly виды — именно как в нашем ТЗ
- **Что взять:** переключатели периодов, таблицы времени

### Дополнительно
- [Task Management & Time Tracking Web Dashboard](https://www.figma.com/community/file/1584063380589294454/task-management-time-tracking-web-dashboard-free-figma-template) — для web-версии тайм-трекинга

---

## 3. Landing page (маркетинговый сайт)

### 🥇 Топ рекомендация: B2Base
- **Ссылка:** [B2Base - SaaS platforms & Startups Figma Template](https://www.figma.com/community/file/1627554158833789846/b2base-saas-platforms-startups-figma-template-free)
- **Почему:** специально для B2B SaaS и CRM-платформ, production-ready, на auto-layout
- **Что взять:** структуру первого экрана, секции "фичи", "цены", "отзывы"

### 🥈 Landing Page UI Kit (B2B)
- **Ссылка:** [Landing Page UI Kit- Saas Landing Page - B2B Page](https://www.figma.com/community/file/1403082622149105351/landing-page-ui-kit-saas-landing-page-b2b-page)
- **Почему:** light/dark mode из коробки, готова для B2B

### Большие коллекции для вдохновения
- [30+ SaaS Landing pages](https://www.figma.com/community/file/1227186272714321255/30-saas-landing-pages)
- [45 SaaS landing page designs](https://www.zoyaqib.com/free-figma-files/45-saas-landing-page-designs-free-figma-file)
- [Все SaaS landing шаблоны на Figma Community](https://www.figma.com/community/website-templates/saas)

---

## 4. Что я рекомендую делать дальше

### Шаг 1: дублирование шаблонов (1-2 часа)
Скопировать в свой Figma-аккаунт топ-3 из каждой категории:
- SmartHR + HRDashboard + PagedOne (web)
- Attendance app + Trackzyn (mobile)
- B2Base + Landing Page UI Kit (landing)

### Шаг 2: аудит и сравнение (полдня)
Посмотреть каждый, отметить:
- Что **берём в наш проект** (компоненты, паттерны)
- Что **переделываем** под свои нужды
- Что **не нужно** (избыточно)

### Шаг 3: создание своего дизайна (2-4 недели)
Один из путей:

**Путь А — нанять дизайнера ($3-7k)**
- Дать ему собранные референсы как brief
- Получить уникальный дизайн под бренд
- **Рекомендую**, если хотите хорошо продаваться IT-сегменту

**Путь Б — собрать на shadcn/ui своими силами ($0)**
- Использовать готовые компоненты shadcn/ui (наш стек уже включает)
- Скопировать структуру с PagedOne (тоже на Tailwind)
- Минимальная кастомизация (цвета, шрифты, лого)
- Получится "ок", но не вау
- **Подходит**, если бюджет 0 и нужно быстро

**Путь В — гибрид (мой совет)**
- Дизайнер делает **landing + первые 5-10 ключевых экранов** ($1.5-3k)
- Дальше — внутренние экраны на shadcn/ui по тем же принципам
- Лучшее соотношение цены/качества

### Шаг 4: дизайн-система
Зафиксировать в Figma + код:
- Палитру цветов (основной, вторичный, success, warning, error)
- Шрифты (web + mobile)
- Компоненты (button, input, card, table, modal)
- Иконки (рекомендую Lucide — уже в shadcn/ui)
- Spacing scale

---

## 5. Готовые источники компонентов (не Figma, а сразу код)

Эти не для Figma, а для прямого использования в коде:

| Источник | Что | Цена |
|----------|-----|------|
| [shadcn/ui](https://ui.shadcn.com) | React + Tailwind компоненты | Бесплатно |
| [Tremor](https://www.tremor.so) | Dashboard-компоненты (графики, KPI) | Бесплатно |
| [Aceternity UI](https://ui.aceternity.com) | Анимированные компоненты для landing | Бесплатно |
| [Magic UI](https://magicui.design) | Эффекты, hero-секции | Бесплатно |
| [TailGrids](https://tailgrids.com) | Большая библиотека UI-блоков | Free + Pro |
| [Untitled UI](https://www.untitledui.com) | Большой Figma kit + React | Free + Pro |

**Особо рекомендую:** комбинация **shadcn/ui** (база) + **Tremor** (дашборды) + **Aceternity UI** (landing) — закрывает 90% потребностей бесплатно.

---

## 6. Цвета и брендинг — рекомендация

**Для HR-системы лучше всего работают:**
- Сине-фиолетовые (доверие, профессионализм): #4F46E5, #6366F1 — как Linear, Notion
- Зелёные акценты (рост, успех): #10B981
- Тёплый нейтральный фон (не чисто-белый): #FAFAFA или #F9FAFB

**Избегать:**
- Красный как основной (агрессия, тревога — плохо для HR)
- Слишком ярких цветов (B2B = спокойный)
- Чёрно-белого монохрома (выглядит дёшево)

**Примеры удачных HR-брендов посмотреть:**
- [Personio](https://www.personio.com) — нежно-фиолетовый
- [Bamboo HR](https://www.bamboohr.com) — зелёный
- [Deel](https://www.deel.com) — чёрный с яркими акцентами
- [Rippling](https://www.rippling.com) — синий
- [Bitrix24](https://www.bitrix24.ru) — пример "плохого" дизайна (слишком много элементов) — что НЕ делать

---

## Sources

- [HR Management шаблоны на Figma Community](https://www.figma.com/community/tag/hr%20management/files)
- [Dashboard шаблоны на Figma Community](https://www.figma.com/community/website-templates/dashboards)
- [HR Dashboard Responsive](https://www.figma.com/community/file/1044488229366944066/hr-dashboard-responsive)
- [Human Resources Management Dashboard](https://www.figma.com/community/file/1090597521617280314/human-resources-management-dashboard)
- [HRDashboard - HR Management Dashboard UI Kit](https://www.figma.com/community/file/1460297082068217556/hrdashboard-hr-management-dashboard-ui-kit)
- [Dashboard HR Management](https://www.figma.com/community/file/1133962379531706067/dashboard-hr-management)
- [HRM Dashboard Figma design 2 page](https://www.figma.com/community/file/1611396089784639078/hrm-dashboard-figma-design-2-page)
- [SmartHR - Free Figma UI Kit](https://www.figma.com/community/file/1539212751721531783/smarthr-free-figma-ui-kit-for-hrm-employee-management)
- [HR Management System](https://www.figma.com/community/file/1242583535658781138/hr-management-system)
- [HR Management Admin UI Kit](https://www.figma.com/community/file/1321141129752993757/hr-management-admin-ui-kit)
- [HRMS High Fidelity](https://www.figma.com/community/file/1426513940538134397/hrmshuman-resource-management-system-employee-mnagement-system-high-fidelity)
- [Admin and Employee Dashboard](https://www.figma.com/community/file/1310164944628781801/admin-and-employee-dashboard)
- [PagedOne HR Management Dashboard (Tailwind)](https://pagedone.io/templates/hr-managment-dashboard)
- [Trackzyn Mobile App UI Kit](https://www.figma.com/community/file/1504339203970424161/trackzyn-task-time-tracker-mobile-app-ui-kit)
- [Attendance app](https://www.figma.com/community/file/1525745998552462934/attendance-app)
- [Timesheet UI](https://www.figma.com/community/file/1430079725676301369/timesheet-ui)
- [Task Management & Time Tracking Web Dashboard](https://www.figma.com/community/file/1584063380589294454/task-management-time-tracking-web-dashboard-free-figma-template)
- [B2Base - SaaS Figma Template](https://www.figma.com/community/file/1627554158833789846/b2base-saas-platforms-startups-figma-template-free)
- [Landing Page UI Kit (B2B)](https://www.figma.com/community/file/1403082622149105351/landing-page-ui-kit-saas-landing-page-b2b-page)
- [30+ SaaS Landing pages](https://www.figma.com/community/file/1227186272714321255/30-saas-landing-pages)
