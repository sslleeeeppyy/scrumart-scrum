# ScrumArt — модуль Scrum

Веб-сервис для небольших студий видеопродакшена: продюсер ведёт бэклог проекта, планирует спринты, а режиссёр, оператор и монтажёр видят свои задачи на Scrum-доске.

Стек: Node.js 20 + Express 4.21.2, страницы рисует шаблонизатор EJS 3.1.10. Данные хранятся в PostgreSQL 16 (второй сервис `db` в `docker-compose.yml`), доступ — библиотека `pg` 8.16.3. Версия 0.0.3.

## Запуск

```text
Репозиторий: https://github.com/sslleeeeppyy/scrumart-scrum
Ветка: lab3
Pull Request: https://github.com/sslleeeeppyy/scrumart-scrum/pull/3
Образ: nikitavrazhkin/mispisit-lab1:0.0.3
Страница образа: https://hub.docker.com/r/nikitavrazhkin/mispisit-lab1

git clone -b lab3 https://github.com/sslleeeeppyy/scrumart-scrum
cd scrumart-scrum
docker compose up -d
```

После запуска открыть http://localhost:8080. Таблицы приложение создаёт само при старте, бэклог сначала пустой.
Проверка сохранности: создать задачу, выполнить `docker compose down` и `docker compose up -d` (без `-v`) — задача на месте.

## Страницы и функции

| Адрес | Что на странице |
|---|---|
| `/` | Главная: версия, текущий спринт, загрузка, переходы ко всем действиям |
| `/tasks/new` → `POST /tasks` | Создание задачи в бэклоге (пустое название или оценка не из шкалы Фибоначчи — форма с ошибками) |
| `/backlog` → `POST /backlog/:id/to-sprint` | Просмотр бэклога и перенос задачи в спринт |
| `/sprint` → `POST /sprint/tasks/:id/next` | Scrum-доска спринта, перевод задачи в следующую колонку |
| `/sprint-overload` | Отказ: задача не помещается в спринт — превышена ёмкость команды (21 SP) |

Проверка отказа: создать две задачи по 13 SP, перенести первую в спринт («В спринт 1»), затем вторую — 13 + 13 = 26 SP больше ёмкости 21 SP, открывается страница отказа. Отказ сохраняется в базе и виден по адресу `/sprint-overload` и после перезапуска.

## Структура

```
server.js              запуск: ждёт базу (db.init), потом слушает 0.0.0.0:8080; главная, 404, 500
routes/backlog.js      бэклог, создание задачи, перенос в спринт
routes/sprint.js       Scrum-доска, смена статуса, страница отказа
routes/util.js         обёртка async-обработчиков
data/db.js             пул pg, схема (CREATE TABLE IF NOT EXISTS), справочники, запросы
views/partials/        header.ejs (меню), footer.ejs (версия)
views/*.ejs            index, backlog, task-new, sprint, sprint-overload, not-found
public/style.css       стили
docker-compose.yml     app + db (postgres:16) + том dbdata
```
