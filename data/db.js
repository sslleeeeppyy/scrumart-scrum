// Постоянное хранение Scrum-проекта ScrumArt в PostgreSQL (сервис db в docker-compose.yml).
// Приложение само создаёт таблицы при запуске (CREATE TABLE IF NOT EXISTS),
// поэтому после первого `docker compose up -d` бэклог и доска пустые.

const { Pool, types } = require('pg');

// Поле DATE отдаём строкой 'ГГГГ-ММ-ДД', без перевода в часовой пояс
types.setTypeParser(1082, (v) => v);

// Адрес базы задаёт docker-compose.yml, пароля в коде нет
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
const PRIORITIES = ['Высокий', 'Средний', 'Низкий'];
const STATUSES = ['К выполнению', 'В работе', 'Готово'];
const ROLES = ['Продюсер', 'Режиссёр', 'Оператор', 'Монтажёр'];

// Справочные строки — часть структуры, а не демо-записи:
// без команды не из кого выбрать исполнителя, без текущего спринта некуда переносить задачи.
const TEAM = [
  ['Анна Смирнова', 'Продюсер'],
  ['Илья Котов', 'Режиссёр'],
  ['Денис Орлов', 'Оператор'],
  ['Мария Лебедева', 'Монтажёр'],
];
// Ёмкость 21 SP — velocity команды из второй работы
const SPRINT = { number: 1, goal: 'Пре-продакшн: сценарий, раскадровка, подготовка к съёмке', start: '2026-11-16', end: '2026-11-27', capacity: 21 };

const SCHEMA = `
-- USER третьего курса без email и password_hash: входа в систему в этой версии нет
CREATE TABLE IF NOT EXISTS users (
  id    SERIAL PRIMARY KEY,
  name  TEXT NOT NULL UNIQUE,
  role  TEXT NOT NULL CHECK (role IN ('Продюсер', 'Режиссёр', 'Оператор', 'Монтажёр'))
);

-- SPRINT третьего курса без project_id: проект в этой версии один
CREATE TABLE IF NOT EXISTS sprints (
  id          SERIAL PRIMARY KEY,
  number      INTEGER NOT NULL UNIQUE,
  goal        TEXT NOT NULL,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  capacity    INTEGER NOT NULL CHECK (capacity > 0)
);

-- TASK третьего курса: признак «в спринте» заменён ссылкой sprint_id (NULL — задача в бэклоге)
CREATE TABLE IF NOT EXISTS tasks (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL CHECK (title <> '' AND length(title) <= 120),
  assignee_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  story_points  INTEGER NOT NULL CHECK (story_points IN (1, 2, 3, 5, 8, 13, 21)),
  priority      TEXT NOT NULL CHECK (priority IN ('Высокий', 'Средний', 'Низкий')),
  status        TEXT NOT NULL DEFAULT 'К выполнению' CHECK (status IN ('К выполнению', 'В работе', 'Готово')),
  sprint_id     INTEGER REFERENCES sprints(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Новая таблица: отказ по ёмкости спринта сохраняется и переживает перезапуск
CREATE TABLE IF NOT EXISTS sprint_refusals (
  id            SERIAL PRIMARY KEY,
  task_id       INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  sprint_id     INTEGER NOT NULL REFERENCES sprints(id) ON DELETE CASCADE,
  attempted_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  sprint_load   INTEGER NOT NULL,
  capacity      INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// База в соседнем контейнере может стартовать дольше приложения —
// повторяем попытку подключения, пока она не начнёт принимать запросы.
async function init({ attempts = 30, delayMs = 2000 } = {}) {
  for (let i = 1; ; i++) {
    try {
      await pool.query('SELECT 1');
      break;
    } catch (err) {
      if (i >= attempts) throw err;
      console.log(`База ещё не готова (${err.code || err.message}), попытка ${i}/${attempts}…`);
      await sleep(delayMs);
    }
  }
  await pool.query(SCHEMA);
  for (const [name, role] of TEAM) {
    await pool.query('INSERT INTO users (name, role) VALUES ($1, $2) ON CONFLICT (name) DO NOTHING', [name, role]);
  }
  await pool.query(
    `INSERT INTO sprints (number, goal, start_date, end_date, capacity)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT (number) DO NOTHING`,
    [SPRINT.number, SPRINT.goal, SPRINT.start, SPRINT.end, SPRINT.capacity],
  );
  console.log('Схема базы готова');
}

// ---------- чтение ----------

async function getUsers() {
  const { rows } = await pool.query('SELECT id, name, role FROM users ORDER BY id');
  return rows;
}

// Текущий спринт — последний по номеру, с загрузкой и выполненным объёмом в SP
async function currentSprint() {
  const { rows } = await pool.query(`
    SELECT s.id, s.number, s.goal, s.start_date AS start, s.end_date AS "end", s.capacity,
           COALESCE(SUM(t.story_points), 0)::int AS load,
           COALESCE(SUM(t.story_points) FILTER (WHERE t.status = 'Готово'), 0)::int AS done,
           COUNT(t.id)::int AS count
    FROM sprints s LEFT JOIN tasks t ON t.sprint_id = s.id
    GROUP BY s.id ORDER BY s.number DESC LIMIT 1`);
  return rows[0];
}

const TASK_SELECT = `
  SELECT t.id, t.title, t.story_points AS "storyPoints", t.priority, t.status,
         t.sprint_id AS "sprintId", t.created_at AS "createdAt",
         t.assignee_id AS "assigneeId", COALESCE(u.name, 'Не назначен') AS assignee, u.role AS "assigneeRole"
  FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id`;

async function backlogTasks() {
  const { rows } = await pool.query(`${TASK_SELECT}
    WHERE t.sprint_id IS NULL
    ORDER BY array_position(ARRAY['Высокий','Средний','Низкий'], t.priority), t.id`);
  return rows;
}

async function sprintTasks(sprintId) {
  const { rows } = await pool.query(`${TASK_SELECT} WHERE t.sprint_id = $1 ORDER BY t.id`, [sprintId]);
  return rows;
}

async function findTask(id) {
  if (!Number.isInteger(id)) return null;
  const { rows } = await pool.query(`${TASK_SELECT} WHERE t.id = $1`, [id]);
  return rows[0] || null;
}

// ---------- изменение ----------

async function addTask({ title, assigneeId, storyPoints, priority }) {
  const { rows } = await pool.query(
    'INSERT INTO tasks (title, assignee_id, story_points, priority) VALUES ($1, $2, $3, $4) RETURNING id',
    [title, assigneeId, storyPoints, priority],
  );
  return rows[0].id;
}

// Перенос задачи из бэклога в спринт. Строка спринта блокируется на время проверки,
// чтобы два одновременных переноса не превысили ёмкость вместе.
// Результат: { moved: true } | { refusalId } | null (нет такой задачи в бэклоге).
async function moveToSprint(taskId, sprintId, userId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const sprint = (await client.query('SELECT id, capacity FROM sprints WHERE id = $1 FOR UPDATE', [sprintId])).rows[0];
    const task = (await client.query('SELECT id, story_points FROM tasks WHERE id = $1 AND sprint_id IS NULL FOR UPDATE', [taskId])).rows[0];
    if (!sprint || !task) {
      await client.query('ROLLBACK');
      return null;
    }
    const { load } = (await client.query(
      'SELECT COALESCE(SUM(story_points), 0)::int AS load FROM tasks WHERE sprint_id = $1', [sprintId],
    )).rows[0];

    if (load + task.story_points > sprint.capacity) {
      // Бизнес-правило Scrum: нельзя брать в спринт больше, чем команда успевает
      const { rows } = await client.query(
        `INSERT INTO sprint_refusals (task_id, sprint_id, attempted_by, sprint_load, capacity)
         VALUES ($1, $2, $3, $4, $5) RETURNING id`,
        [task.id, sprint.id, userId, load, sprint.capacity],
      );
      await client.query('COMMIT');
      return { refusalId: rows[0].id };
    }

    await client.query("UPDATE tasks SET sprint_id = $1, status = 'К выполнению' WHERE id = $2", [sprint.id, task.id]);
    await client.query('COMMIT');
    return { moved: true };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

// Передвинуть задачу спринта в следующую колонку доски
async function nextStatus(taskId) {
  const { rowCount } = await pool.query(
    `UPDATE tasks SET status = CASE status WHEN 'К выполнению' THEN 'В работе' ELSE 'Готово' END
     WHERE id = $1 AND sprint_id IS NOT NULL`,
    [taskId],
  );
  return rowCount > 0;
}

// ---------- отказы ----------

async function getRefusal(id) {
  const where = Number.isInteger(id) ? 'WHERE r.id = $1' : '';
  const { rows } = await pool.query(`
    SELECT r.id, r.sprint_load AS load, r.capacity, r.created_at AS at,
           t.title, t.story_points AS "storyPoints", COALESCE(a.name, 'Не назначен') AS assignee,
           s.number AS "sprintNumber", s.goal AS "sprintGoal",
           COALESCE(u.name, '—') AS who, u.role AS "whoRole"
    FROM sprint_refusals r
    JOIN tasks t ON t.id = r.task_id
    JOIN sprints s ON s.id = r.sprint_id
    LEFT JOIN users a ON a.id = t.assignee_id
    LEFT JOIN users u ON u.id = r.attempted_by
    ${where}
    ORDER BY r.id DESC LIMIT 1`, Number.isInteger(id) ? [id] : []);
  return rows[0] || null;
}

async function refusalCount() {
  const { rows } = await pool.query('SELECT COUNT(*)::int AS n FROM sprint_refusals');
  return rows[0].n;
}

module.exports = {
  FIBONACCI, PRIORITIES, STATUSES, ROLES,
  pool, init,
  getUsers, currentSprint, backlogTasks, sprintTasks, findTask,
  addTask, moveToSprint, nextStatus, getRefusal, refusalCount,
};
