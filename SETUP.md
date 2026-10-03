# Настройка и процессы

## Окружение

- **Node.js 24 LTS** (`.nvmrc`). В `.npmrc` включён `engine-strict` — на старой версии
  `npm install` сразу упадёт с понятной ошибкой.
- **Docker** — для локального PostgreSQL и e2e-тестов (Testcontainers).
- Версии зависимостей фиксируются точно (`save-exact`), обновления приходят через Dependabot.

```bash
nvm install && nvm use
npm install
cp .env.example .env
npm run db:up && npm run db:migrate && npm run db:seed
npm run dev
```

Если порт 5432 занят другим проектом: `POSTGRES_PORT=55432 npm run db:up` и тот же
порт в `DATABASE_URL`.

### Переменные окружения

Описаны и валидируются в `src/core/config/env.schema.ts`. Node 24 читает `.env`
нативно — `dotenv` не нужен. В проде переменные задаёт платформа.

| Переменная                          | По умолчанию                   | Описание                                               |
| ----------------------------------- | ------------------------------ | ------------------------------------------------------ |
| `NODE_ENV`                          | `development`                  | `development` / `test` / `production`                  |
| `HOST`, `PORT`                      | `0.0.0.0`, `3000`              | Адрес HTTP-сервера                                     |
| `LOG_LEVEL`                         | `info`                         | Уровень pino; в dev — читаемый вывод                   |
| `TRUST_PROXY`                       | `false`                        | `true` за балансировщиком (реальные IP для rate limit) |
| `DATABASE_URL`                      | — (обязательно)                | `postgres://user:pass@host:5432/db`                    |
| `DATABASE_POOL_MAX`                 | `10`                           | Размер пула соединений                                 |
| `JWT_SECRET`                        | — (обязательно, ≥ 32 символов) | Секрет подписи токенов                                 |
| `JWT_EXPIRES_IN_SECONDS`            | `3600`                         | Время жизни access-токена                              |
| `CORS_ORIGINS`                      | `http://localhost:5173`        | Разрешённые origin через запятую                       |
| `SWAGGER_ENABLED`                   | `true` вне production          | Swagger UI на `/docs`                                  |
| `THROTTLE_TTL_MS`, `THROTTLE_LIMIT` | `60000`, `100`                 | Глобальный rate limit                                  |

Новая переменная: добавить в `env.schema.ts` и `AppConfig` (`app-config.ts`),
описать в `.env.example` и в таблице выше.

## Git-хуки (Husky)

| Хук          | Что делает                                                                                                                                                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pre-commit` | Версия Node (из `engines`), имя ветки и запрет коммитов в `main`/`master`/`develop`; `lint-staged` по staged-файлам: secretlint → prettier → eslint → `tsc` → проверка миграций (если менялись таблицы) → связанные unit-тесты |
| `commit-msg` | Commitlint: `type(scope): subject`                                                                                                                                                                                             |
| `pre-push`   | Версия Node, имя ветки + полный `npm run verify`                                                                                                                                                                               |

E2E-тесты в хуки не входят (нужен Docker, ~20 секунд) — их гоняет CI. Локально:
`npm run test:e2e`.

### Ветки и коммиты

- Ветка: `<type>/<kebab-case>` — `feat/orders`, `fix/login-rate-limit`.
  Типы: `feat, fix, refactor, perf, style, docs, test, chore, build, ci, release, hotfix`.
- Коммит: `type(scope): subject`, scope обязателен (обычно имя модуля), subject с
  маленькой буквы, без точки, заголовок до 100 символов.

```text
feat(orders): add order cancellation
fix(auth): return 401 for expired tokens
chore(deps): bump nestjs to 12.2
```

Экстренный обход хуков (CI всё равно проверит то же самое): `HUSKY=0 git commit …`.

## CI (GitHub Actions)

| Workflow / job | Что проверяет                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| `ci / quality` | `npm run verify`: формат, линт, архитектура, типы, unit, OpenAPI, миграции, Knip |
| `ci / test`    | Unit + e2e на реальном PostgreSQL, пороги покрытия                               |
| `ci / docker`  | Сборка образа, smoke-тест (PostgreSQL → миграции → API → `/health/ready`), Trivy |
| `ci / commits` | Commitlint для коммитов PR и **заголовка PR** (он станет squash-коммитом)        |
| `ci / audit`   | `npm audit --audit-level=high`, проверка подписей пакетов                        |
| `codeql`       | Статический анализ безопасности (на PR, push и раз в неделю)                     |

Dependabot раз в неделю группирует обновления npm, Docker-образов и GitHub Actions.

## Защита `main` на GitHub

`Settings → Rules → Rulesets → New branch ruleset`:

| Настройка                              | Значение                                                      |
| -------------------------------------- | ------------------------------------------------------------- |
| Target branches                        | Default branch (`main`)                                       |
| Restrict deletions, Block force pushes | ✔                                                             |
| Require linear history                 | ✔                                                             |
| Require a pull request before merging  | ✔, approvals ≥ 1, dismiss stale approvals                     |
| Require review from Code Owners        | ✔ (заполните `.github/CODEOWNERS`)                            |
| Require conversation resolution        | ✔                                                             |
| Require status checks to pass          | ✔: `quality`, `test`, `docker`, `commits`, `audit`, `analyze` |
| Require branches to be up to date      | ✔                                                             |

`Settings → General → Pull Requests`: оставьте только **Squash merging** с заголовком
PR как сообщением коммита. `Settings → Code security`: включите Dependabot alerts и
secret scanning с push protection.

## Деплой

Образ один для всех окружений, конфигурация — через переменные окружения.

```bash
docker build -t nest-starter .
docker run --rm --env-file .env.production nest-starter node dist/app/migrate.js   # 1. миграции
docker run -d -p 3000:3000 --env-file .env.production nest-starter                  # 2. приложение
```

- Образ работает от непривилегированного пользователя `node`, содержит только
  prod-зависимости и имеет `HEALTHCHECK`.
- Оркестратору: liveness → `/health/live`, readiness → `/health/ready`.
- Приложение корректно завершается по `SIGTERM`: закрывает соединения и пул БД.
- Rate limit хранится в памяти процесса. При нескольких репликах подключите общее
  хранилище для `@nestjs/throttler` (например, Redis).
- Весь стек локально: `npm run stack:up` (PostgreSQL → миграции → API), остановить —
  `npm run stack:down`.

### Имена в Docker

Всё, что создаёт проект, называется с префиксом `nest-starter`, поэтому в Docker
Desktop сразу понятно, что к чему относится:

| Что                     | Имя                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Группа (compose-проект) | `nest-starter`                                                                                  |
| Контейнеры              | `nest-starter-postgres`, `nest-starter-migrate`, `nest-starter-api`                             |
| Образ API               | `nest-starter-api:local`                                                                        |
| Том с данными БД        | `nest-starter-postgres-data`                                                                    |
| Сеть                    | `nest-starter-network`                                                                          |
| БД e2e-тестов           | группа `nest-starter-e2e`, контейнер `nest-starter-e2e-postgres-<pid>` (удаляется после тестов) |

Новые сервисы добавляйте по тому же правилу: `container_name: nest-starter-<роль>`.

## Бюджеты качества

| Метрика                | Порог     | Где менять         |
| ---------------------- | --------- | ------------------ |
| Покрытие строк / веток | 90% / 85% | `vitest.config.ts` |
| Сложность функции      | 10        | `eslint.config.js` |
| Строк в файле          | 300       | `eslint.config.js` |
| Вложенность блоков     | 3         | `eslint.config.js` |

Пороги — «храповик»: поднимаются осознанно, снижаются только с обоснованием в PR.

## Что сознательно не включено

Добавляйте, когда появится реальная потребность:

- **Refresh-токены и сессии** — сейчас только короткоживущий access-токен.
- **Redis** — для кэша и распределённого rate limit при нескольких репликах.
- **Очереди** (BullMQ) — для фоновых задач вроде отправки писем.
- **OpenTelemetry** — распределённые трейсы и метрики (request-id уже есть).
- **Sentry** — сбор ошибок (точка подключения — `AllExceptionsFilter`).
