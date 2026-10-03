# Nest Starter

Production-ready стартер REST API на NestJS 12 + Fastify + PostgreSQL со строгой
архитектурой и автоматическими проверками на каждом шаге: в редакторе, на коммите,
на пуше и в CI. Реализует тот же API-контракт, что использует
[react-starter](../react-starter).

```bash
nvm use                  # Node 24 LTS (см. .nvmrc)
npm install              # заодно ставит git-хуки (husky)
cp .env.example .env
npm run db:up            # PostgreSQL 18 в Docker
npm run db:migrate       # применить миграции
npm run db:seed          # демо-пользователь demo@example.com / password123
npm run dev              # http://localhost:3000, Swagger UI — /docs
```

---

## Стек

| Задача         | Решение                                                                |
| -------------- | ---------------------------------------------------------------------- |
| Фреймворк      | NestJS 12 (нативный ESM) на Fastify 5                                  |
| Язык           | TypeScript 6, максимально строгий `tsconfig`                           |
| Валидация      | zod 4 через встроенный в Nest 12 Standard Schema — без class-validator |
| Ответы         | zod-схемы ответа: лишние поля (например `passwordHash`) вырезаются     |
| API-контракт   | OpenAPI из тех же zod-схем → `openapi.json` в репозитории              |
| База данных    | PostgreSQL 18 + Drizzle ORM, SQL-миграции в `drizzle/`                 |
| Конфигурация   | `.env` читается нативно (Node 24), валидация env на zod при старте     |
| Аутентификация | JWT (HS256), `scrypt` по рекомендациям OWASP, «закрыто по умолчанию»   |
| Безопасность   | Helmet, CORS по списку, rate limiting, лимит тела запроса              |
| Логи           | pino: JSON в проде, request-id, маскировка секретов                    |
| Health-checks  | `/health/live`, `/health/ready` (Terminus)                             |
| Тесты          | Vitest 5 + SWC; e2e на реальном PostgreSQL (Testcontainers)            |
| Поставка       | Многоэтапный Dockerfile (non-root, healthcheck), docker compose        |

## Что проверяется автоматически

| Проверка                              | Инструмент                                     | Где                        |
| ------------------------------------- | ---------------------------------------------- | -------------------------- |
| Архитектура (слои, границы модулей)   | `eslint-plugin-boundaries`                     | IDE, commit, push, CI      |
| SQL только в репозиториях             | ESLint `no-restricted-imports`                 | IDE, commit, push, CI      |
| `process.env` только в `core/config`  | ESLint `no-restricted-syntax`                  | IDE, commit, push, CI      |
| Качество кода                         | typescript-eslint strict-type-checked, unicorn | IDE, commit, push, CI      |
| Именование файлов и папок             | `eslint-plugin-check-file` (kebab-case)        | IDE, commit, push, CI      |
| Форматирование                        | Prettier                                       | IDE, commit, push, CI      |
| Типы                                  | `tsc --noEmit`                                 | commit, push, CI           |
| Unit-тесты                            | Vitest                                         | commit (related), push, CI |
| E2E + покрытие (90% строк, 85% веток) | Vitest + Testcontainers                        | CI                         |
| Актуальность `openapi.json`           | `npm run openapi:check`                        | push, CI                   |
| Миграции соответствуют схеме          | `npm run db:check`                             | commit, push, CI           |
| Мёртвый код и зависимости             | Knip                                           | push, CI                   |
| Секреты в коде                        | Secretlint                                     | commit, push, CI           |
| Сообщения коммитов и имя ветки        | Commitlint, `scripts/check-branch-name.mjs`    | commit, push, CI           |
| Docker-образ                          | сборка + smoke-тест + сканирование Trivy       | CI                         |
| Уязвимости                            | `npm audit`, CodeQL, Dependabot                | CI                         |

## Структура

```
src/
├── app/        # точка сборки: AppModule, фабрика приложения, main/migrate/seed/openapi
├── modules/    # бизнес-модули: auth, users, contacts
│   └── users/  #   controller → service → repository → table
├── core/       # инфраструктура: config, database, logger, http, health
└── common/     # общие декораторы и схемы без зависимостей от инфраструктуры
test/
├── setup/      # Testcontainers, сборка тестового приложения
└── e2e/        # HTTP-тесты через app.inject()
drizzle/        # SQL-миграции (генерируются, коммитятся)
openapi.json    # API-контракт (генерируется, коммитится)
```

Правила импорта и устройство модуля — в [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## API

| Метод  | Путь                            | Доступ    | Описание                          |
| ------ | ------------------------------- | --------- | --------------------------------- |
| `POST` | `/api/v1/auth/register`         | публичный | Регистрация → `{ token, user }`   |
| `POST` | `/api/v1/auth/login`            | публичный | Вход → `{ token, user }`          |
| `GET`  | `/api/v1/user/me`               | Bearer    | Профиль текущего пользователя     |
| `POST` | `/api/v1/contacts`              | публичный | Сообщение из формы обратной связи |
| `GET`  | `/health/live`, `/health/ready` | публичный | Пробы для оркестратора            |

Любая ошибка возвращается в одном формате:

```json
{
  "statusCode": 400,
  "error": "Bad Request",
  "message": "Validation failed",
  "details": [{ "path": "email", "message": "Invalid email address" }],
  "requestId": "1b0b99c8-6fe9-4816-b3f8-a3ef89eda839"
}
```

### Связка с react-starter

Фронтенд генерирует типы из этого контракта:

```bash
# в react-starter
OPENAPI_SPEC_URL=../nest-starter/openapi.json npm run generate:api
```

и ходит в API с `VITE_API_BASE_URL=http://localhost:3000/api/v1` (CORS для
`http://localhost:5173` уже разрешён в `.env.example`).

## Скрипты

| Команда                     | Описание                                                                     |
| --------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`               | Dev-сервер с перезапуском                                                    |
| `npm run build`             | Сборка в `dist/`                                                             |
| `npm run start`             | Запуск собранного приложения                                                 |
| `npm run verify`            | **Единый quality gate** (формат, линт, типы, unit, контракт, миграции, knip) |
| `npm run test`              | Unit-тесты в watch-режиме                                                    |
| `npm run test:e2e`          | E2E на реальном PostgreSQL (нужен Docker)                                    |
| `npm run test:coverage`     | Все тесты + пороги покрытия (нужен Docker)                                   |
| `npm run lint` / `format`   | Автоисправление ESLint / Prettier                                            |
| `npm run db:up` / `db:down` | Поднять / остановить PostgreSQL в Docker                                     |
| `npm run db:generate`       | Сгенерировать миграцию после изменения `*.table.ts`                          |
| `npm run db:migrate`        | Применить миграции                                                           |
| `npm run db:check`          | Проверить, что миграции соответствуют схеме                                  |
| `npm run db:studio`         | Drizzle Studio — просмотр данных                                             |
| `npm run db:seed`           | Создать демо-данные (не работает в production)                               |
| `npm run openapi`           | Обновить `openapi.json`                                                      |
| `npm run generate:module`   | Создать модуль: `npm run generate:module -- orders`                          |
| `npm run patch/minor/major` | Поднять версию и создать git-тег                                             |

## Рабочий процесс

```bash
git switch -c feat/orders                          # имя ветки: <type>/<kebab-case>
npm run generate:module -- orders                  # модуль по всем соглашениям
npm run db:generate                                # миграция для новой таблицы
npm run openapi                                    # обновить контракт
git commit -m "feat(orders): add orders module"    # type(scope): subject
git push -u origin feat/orders                     # pre-push запустит npm run verify
```

В `main` код попадает только через Pull Request с зелёным CI. Хуки, CI, защита
веток GitHub и деплой — в [SETUP.md](SETUP.md).
