// Демо-данные Scrum-проекта. Хранятся в памяти процесса:
// после перезапуска контейнера всё возвращается к исходному состоянию.
// Структура повторяет сущности USER, PROJECT, SPRINT, TASK из ЛР5 (3 курс).

const FIBONACCI = [1, 2, 3, 5, 8, 13, 21];
const PRIORITIES = ['Высокий', 'Средний', 'Низкий'];
const STATUSES = ['К выполнению', 'В работе', 'Готово'];

const users = [
  { id: 1, name: 'Анна Смирнова', role: 'Продюсер' },
  { id: 2, name: 'Илья Котов', role: 'Режиссёр' },
  { id: 3, name: 'Денис Орлов', role: 'Оператор' },
  { id: 4, name: 'Мария Лебедева', role: 'Монтажёр' },
];

const project = {
  id: 1,
  title: 'Рекламный ролик кофейни «Зерно»',
  deadline: '2026-11-20',
};

// Завершённые спринты: по их velocity продюсер задаёт ёмкость текущего
const closedSprints = [
  { number: 1, goal: 'Сценарий и раскадровка', velocity: 19 },
  { number: 2, goal: 'Подготовка к съёмке', velocity: 21 },
];

const sprint = {
  number: 3,
  goal: 'Съёмочный день и черновой монтаж',
  start: '2026-10-05',
  end: '2026-10-16',
  // ёмкость = velocity прошлого спринта: больше команда не успевает
  capacity: closedSprints[closedSprints.length - 1].velocity,
};

// sprint: true — задача в текущем спринте, false — лежит в бэклоге
const tasks = [
  { id: 1, title: 'Утвердить раскадровку с заказчиком', assigneeId: 2, storyPoints: 3, priority: 'Высокий', status: 'Готово', sprint: true },
  { id: 2, title: 'Съёмка в кофейне: интерьер и бариста', assigneeId: 3, storyPoints: 8, priority: 'Высокий', status: 'В работе', sprint: true },
  { id: 3, title: 'Черновой монтаж 30-секундной версии', assigneeId: 4, storyPoints: 5, priority: 'Высокий', status: 'К выполнению', sprint: true },
  { id: 4, title: 'Подобрать музыку под черновой монтаж', assigneeId: 4, storyPoints: 2, priority: 'Средний', status: 'К выполнению', sprint: true },
  { id: 5, title: 'Цветокоррекция финальной версии', assigneeId: 4, storyPoints: 5, priority: 'Высокий', status: 'К выполнению', sprint: false },
  { id: 6, title: 'Сведение звука и голос диктора', assigneeId: 2, storyPoints: 3, priority: 'Средний', status: 'К выполнению', sprint: false },
  { id: 7, title: 'Вертикальная версия 9:16 для соцсетей', assigneeId: 4, storyPoints: 8, priority: 'Средний', status: 'К выполнению', sprint: false },
  { id: 8, title: 'Титры и логотип в финале', assigneeId: null, storyPoints: 2, priority: 'Низкий', status: 'К выполнению', sprint: false },
];

let nextId = tasks.length + 1;

function userName(id) {
  const u = users.find((x) => x.id === id);
  return u ? u.name : 'Не назначен';
}

function findTask(id) {
  return tasks.find((t) => t.id === id);
}

function backlogTasks() {
  const order = (p) => PRIORITIES.indexOf(p);
  return tasks.filter((t) => !t.sprint).sort((a, b) => order(a.priority) - order(b.priority) || a.id - b.id);
}

function sprintTasks() {
  return tasks.filter((t) => t.sprint);
}

function sprintLoad() {
  return sprintTasks().reduce((sum, t) => sum + t.storyPoints, 0);
}

function sprintDone() {
  return sprintTasks().filter((t) => t.status === 'Готово').reduce((sum, t) => sum + t.storyPoints, 0);
}

function addTask({ title, assigneeId, storyPoints, priority }) {
  const task = { id: nextId++, title, assigneeId, storyPoints, priority, status: 'К выполнению', sprint: false };
  tasks.push(task);
  return task;
}

module.exports = {
  FIBONACCI, PRIORITIES, STATUSES,
  users, project, sprint, closedSprints, tasks,
  userName, findTask, backlogTasks, sprintTasks, sprintLoad, sprintDone, addTask,
};
