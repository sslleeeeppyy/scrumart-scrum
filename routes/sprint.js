// Спринт: Scrum-доска, смена статуса задачи, страница отказа при превышении ёмкости
const express = require('express');
const db = require('../data/project');

const router = express.Router();

// Просмотр Scrum-доски текущего спринта
router.get('/sprint', (req, res) => {
  const columns = db.STATUSES.map((status) => ({
    status,
    tasks: db.sprintTasks().filter((t) => t.status === status),
  }));
  res.render('sprint', {
    title: `Спринт ${db.sprint.number}`,
    columns,
    load: db.sprintLoad(),
    done: db.sprintDone(),
    added: Number(req.query.added) || null,
  });
});

// Передвинуть задачу в следующую колонку доски
router.post('/sprint/tasks/:id/next', (req, res, next) => {
  const task = db.findTask(Number(req.params.id));
  if (!task || !task.sprint) return next();
  const i = db.STATUSES.indexOf(task.status);
  if (i < db.STATUSES.length - 1) task.status = db.STATUSES[i + 1];
  res.redirect(303, '/sprint');
});

// Отказ: задача не помещается в спринт.
// Без параметра показывает пример — самую крупную задачу бэклога, которая не влезет.
router.get('/sprint-overload', (req, res) => {
  const load = db.sprintLoad();
  let task = db.findTask(Number(req.query.task));
  if (!task || task.sprint) {
    task = db.backlogTasks()
      .filter((t) => load + t.storyPoints > db.sprint.capacity)
      .sort((a, b) => b.storyPoints - a.storyPoints)[0] || null;
  }
  res.status(req.query.task ? 409 : 200).render('sprint-overload', {
    title: 'Задача не добавлена в спринт',
    task,
    load,
    free: Math.max(db.sprint.capacity - load, 0),
    isExample: !req.query.task,
  });
});

module.exports = router;
