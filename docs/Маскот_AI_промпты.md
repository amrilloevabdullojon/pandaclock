# Маскот Pandaclock — AI-промпты для генерации
## Готовые промпты для Midjourney / DALL-E / Stable Diffusion / Flux

**Версия:** 1.0
**Дата:** 2026-05-24

---

## 1. Концепция маскота

**Имя:** Pandi (рабочее, можно сменить)
**Персонаж:** Дружелюбная панда — символ продукта Pandaclock
**Характер:** Спокойная, заботливая, надёжная, чуть-чуть юморная
**Атрибут:** Часы (на запястье, на стене, в лапах) — связь с "O'Clock" в названии

**Стилистика:**
- **Flat illustration / vector style** (не реалистичная)
- Чистые линии, минимум деталей
- Палитра под наш бренд: фиолетовый (#5B4FE2), белый, чёрный (морда панды), пастельные акценты
- Плоские формы, без тяжёлых градиентов
- Похоже на стиль Notion / Linear / Slack illustrations

**Что НЕ хотим:**
- ❌ Реалистичная фотопанда
- ❌ Анимешный стиль (слишком детский)
- ❌ 3D-рендер (слишком тяжёлый для landing)
- ❌ Стиль Disney/Pixar (вторичный, заезженный)

---

## 2. Базовый стиль-промпт (используется во всех генерациях)

```
Cute cartoon panda mascot, flat vector illustration style,
clean minimal lines, soft pastel colors with purple #5B4FE2 accents,
white background, modern SaaS startup illustration style,
friendly and professional, similar to Notion or Linear illustrations,
no gradients, no realistic shading, 2D flat design
```

**Negative prompt (для Stable Diffusion):**
```
realistic, photographic, 3d render, anime, manga,
heavy shadows, complex background, multiple subjects,
text, watermark, low quality, blurry
```

---

## 3. Промпты для каждой сцены

### 3.1 Hero — панда с дашбордом

**Сцена:** Панда сидит за ноутбуком/планшетом, на экране — дашборд с графиками.

```
Cute cartoon panda mascot sitting at a desk with a laptop,
looking at colorful charts and graphs on the screen, smiling,
flat vector illustration style, clean minimal lines,
purple #5B4FE2 and white color scheme, professional SaaS look,
similar to Notion or Linear illustrations, white background,
2D flat design, no realistic shading
```

**Вариация:** панда указывает лапой на график (gesture invites attention).

### 3.2 Pricing — панда с табличкой "Популярный"

**Сцена:** Панда держит лапами табличку с надписью или показывает большой палец вверх.

```
Cute cartoon panda mascot holding a small sign with thumbs up,
celebrating expression, flat vector illustration style,
purple #5B4FE2 accents, white background,
professional SaaS startup style, 2D flat design,
clean minimal lines, friendly and welcoming
```

### 3.3 Empty state — "У вас пока нет задач"

**Сцена:** Панда расслабленно лежит на больших часах, отдыхает.

```
Cute cartoon panda mascot lying relaxed on a giant alarm clock,
peaceful expression, eyes closed, content,
flat vector illustration style, purple #5B4FE2 accent on the clock,
white background, minimalist SaaS empty state illustration,
clean lines, friendly mood, 2D flat design
```

### 3.4 404 page — потерянная панда

**Сцена:** Панда с картой в лапах, выглядит растерянной (но милой).

```
Cute cartoon panda mascot holding a map upside down,
confused expression with question marks above head,
flat vector illustration style, purple #5B4FE2 accents,
white background, friendly humor, SaaS 404 page illustration,
clean minimal lines, 2D flat design
```

### 3.5 Onboarding — приветствующая панда

**Сцена:** Панда машет лапой, улыбается, словно встречает нового пользователя.

```
Cute cartoon panda mascot waving hello with one paw,
big welcoming smile, friendly expression,
flat vector illustration style, purple #5B4FE2 accents,
white background, SaaS onboarding welcome screen style,
clean minimal lines, 2D flat design
```

### 3.6 Loading state — крутящаяся панда

**Сцена:** Панда с большими часами, стрелки которых вращаются (для GIF/Lottie-анимации).

```
Cute cartoon panda mascot holding a large analog clock,
the clock face is the main element,
flat vector illustration style, purple #5B4FE2 accent on clock hands,
white background, designed for loading animation,
clean minimal lines, 2D flat design,
single subject centered composition
```

### 3.7 Success state — счастливая панда

**Сцена:** Панда с поднятыми лапами, конфетти вокруг.

```
Cute cartoon panda mascot with paws raised in celebration,
confetti and stars around, happy excited expression,
flat vector illustration style, purple #5B4FE2 accents,
soft pastel colors, white background,
SaaS success state illustration, 2D flat design,
clean minimal lines, joyful mood
```

### 3.8 Error / Maintenance — панда с инструментами

**Сцена:** Панда в каске, с гаечным ключом, "что-то чинит".

```
Cute cartoon panda mascot wearing a yellow construction helmet,
holding a wrench, working on a giant gear,
flat vector illustration style, purple #5B4FE2 accents,
white background, friendly maintenance page illustration,
clean minimal lines, 2D flat design
```

### 3.9 Footer / About — портрет панды

**Сцена:** Просто красивый портрет головы панды (можно как favicon).

```
Cute cartoon panda head portrait, front view, smiling,
flat vector illustration style, perfect for logo and favicon,
purple #5B4FE2 background, white panda face,
black ears and eye patches, minimal clean design,
SaaS brand mascot, 2D flat design, centered composition
```

### 3.10 Логотип (Logo)

**Сцена:** Голова панды в кругу — для использования как иконка приложения.

```
Cute panda head logo design, circular frame, minimal flat design,
purple #5B4FE2 circle background, white panda face,
black ears, eye patches and nose, simple geometric shapes,
modern SaaS startup logo style, perfect for app icon,
no text, centered composition, vector style
```

---

## 4. Рекомендуемые инструменты

| Инструмент | Цена | Что подходит | Качество |
|------------|------|--------------|----------|
| **Midjourney** | $10-30/мес | Best для flat illustrations | ⭐⭐⭐⭐⭐ |
| **Flux 1.1 Pro** (на fal.ai) | $0.05/image | Хорошо, дёшево | ⭐⭐⭐⭐⭐ |
| **DALL-E 3** (ChatGPT Plus) | $20/мес | Хорошо для простых сцен | ⭐⭐⭐⭐ |
| **Stable Diffusion XL** | Бесплатно (свой GPU) | Лучше с дообучением | ⭐⭐⭐ |
| **Leonardo AI** | Free tier + $10/мес | Хорошо с готовыми моделями | ⭐⭐⭐⭐ |
| **Ideogram** | Free tier + $7/мес | Умеет текст + иконки | ⭐⭐⭐⭐ |

**Моя рекомендация:** Midjourney или Flux 1.1 Pro для финальных версий, DALL-E 3 для быстрого прототипирования.

---

## 5. Процесс генерации

### Шаг 1: Генерация (1-2 дня)
1. Запустить каждый промпт по 4-8 раз (разные seed)
2. Отобрать 2-3 лучших варианта на каждую сцену
3. Сложить в Figma-доску для сравнения

### Шаг 2: Доработка в Figma (1 день)
- AI-генерации часто имеют артефакты (странные лапы, лишние детали)
- Нужно **векторизовать** в Figma или Illustrator
- Унифицировать стиль (одинаковые пропорции, цвета, контуры)
- Можно использовать [SVG Trace в Figma](https://www.figma.com/community/plugin/735098390272716381) или Adobe Illustrator

### Шаг 3: Сохранение
- Сохранять как SVG (для веба) и PNG @2x (резерв)
- Положить в `/public/illustrations/` в проекте
- Создать Figma-библиотеку для повторного использования

---

## 6. Стилевые ориентиры (что показать AI / дизайнеру)

Хорошие референсы для стиля:
- [Notion illustrations](https://www.notion.so) (illustration на пустых страницах)
- [Linear app illustrations](https://linear.app)
- [Stripe illustrations](https://stripe.com/illustrations)
- [Figma illustrations](https://www.figma.com)
- [unDraw](https://undraw.co) — бесплатные иллюстрации в нашем стиле

⭐ Если AI не даёт нужный стиль с первого раза — добавить в промпт:
```
in the style of unDraw illustrations, flat geometric shapes,
minimal but expressive
```

---

## 7. Бюджет

| Вариант | Стоимость | Время |
|---------|-----------|-------|
| **DIY на Flux 1.1 Pro** | ~$5 (100 генераций) | 2-3 дня |
| **DIY на Midjourney** | $30 (один месяц) | 2-3 дня |
| **Нанять иллюстратора** | $300-600 (10 сцен) | 1-2 недели |
| **Готовые на unDraw** | бесплатно | 1 час |

⭐ **Моя рекомендация:** начать с **Flux 1.1 Pro** ($5) + 1 день работы дизайнера для векторизации. Итого ~$50-100 + время.

---

## 8. Что делать прямо сейчас

1. Зайти на [fal.ai](https://fal.ai) или [Midjourney](https://midjourney.com)
2. Скопировать промпт 3.1 (Hero) → сгенерировать 8 вариантов
3. Выбрать лучший → пропустить через остальные 9 промптов с тем же сидом для консистентности стиля
4. Векторизовать в Figma или Illustrator
5. Сохранить в проект как SVG
