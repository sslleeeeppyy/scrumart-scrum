// Спринт: Scrum-доска, смена статуса задачи, страница отказа при превышении ёмкости
const express = require('express');
const db = require('../data/db');
const { ah } = require('./util');

const router = express.Router();

// Просмотр Scrum-доски текущего спринта
router.get('/sprint', ah(async (req, res) => {
  const tasks = await db.sprintTasks(res.locals.sprint.id);
  const columns = db.STATUSES.map((status) => ({ status, tasks: tasks.filter((t) => t.status === status) }));
  const added = Number(req.query.added) || null;
  res.render('sprint', {
    title: `Спринт ${res.locals.sprint.number}`,
    columns,
    added,
    addedTask: added ? tasks.find((t) => t.id === added) || null : null,
  });
}));

// Передвинуть задачу в следующую колонку доски
router.post('/sprint/tasks/:id/next', ah(async (req, res, next) => {
  if (!(await db.nextStatus(Number(req.params.id)))) return next();
  res.redirect(303, '/sprint');
}));

// Отказ: задача не помещается в спринт.
// ?id=N — конкретный отказ из базы; без параметра — последний сохранённый отказ,
// а если отказов ещё не было — пример с объяснением правила.
router.get('/sprint-overload', ah(async (req, res) => {
  const id = req.query.id !== undefined ? Number(req.query.id) : undefined;
  const refusal = await db.getRefusal(Number.isInteger(id) ? id : undefined);
  if (id !== undefined && (!refusal || refusal.id !== id)) {
    return res.status(404).render('not-found', { title: 'Страница не найдена' });
  }
  res.render('sprint-overload', {
    title: 'Задача не добавлена в спринт',
    refusal,
    fromAction: id !== undefined,
    total: await db.refusalCount(),
  });
}));

module.exports = router;
