// Бэклог: просмотр, создание задачи, перенос задачи в спринт (с проверкой ёмкости)
const express = require('express');
const db = require('../data/db');
const { ah } = require('./util');

const router = express.Router();

// Просмотр бэклога
router.get('/backlog', ah(async (req, res) => {
  const created = Number(req.query.created) || null;
  res.render('backlog', {
    title: 'Бэклог',
    tasks: await db.backlogTasks(),
    created,
    createdTask: created ? await db.findTask(created) : null,
  });
}));

// Форма новой задачи
router.get('/tasks/new', (req, res) => {
  res.render('task-new', { title: 'Новая задача', errors: [], form: {} });
});

// Создание задачи в бэклоге (изменение данных)
router.post('/tasks', ah(async (req, res) => {
  const form = {
    title: (req.body.title || '').trim(),
    assigneeId: req.body.assigneeId ? Number(req.body.assigneeId) : null,
    storyPoints: Number(req.body.storyPoints),
    priority: req.body.priority,
  };

  const errors = [];
  if (!form.title) errors.push('Укажите название задачи.');
  if (form.title.length > 120) errors.push('Название задачи — не длиннее 120 символов.');
  if (!db.FIBONACCI.includes(form.storyPoints)) {
    errors.push(`Оценка в story points должна быть числом из шкалы Фибоначчи: ${db.FIBONACCI.join(', ')}.`);
  }
  if (!db.PRIORITIES.includes(form.priority)) errors.push('Выберите приоритет задачи.');
  if (form.assigneeId !== null && !res.locals.users.some((u) => u.id === form.assigneeId)) {
    errors.push('Выбранный исполнитель не входит в команду проекта.');
  }

  if (errors.length) {
    return res.status(422).render('task-new', { title: 'Новая задача', errors, form: req.body });
  }

  const id = await db.addTask(form);
  res.redirect(303, `/backlog?created=${id}`);
}));

// Перенос задачи из бэклога в текущий спринт
router.post('/backlog/:id/to-sprint', ah(async (req, res, next) => {
  const result = await db.moveToSprint(Number(req.params.id), res.locals.sprint.id, res.locals.currentUser.id);
  if (!result) return next(); // нет такой задачи в бэклоге → 404
  if (result.refusalId) return res.redirect(303, `/sprint-overload?id=${result.refusalId}`);
  res.redirect(303, `/sprint?added=${req.params.id}`);
}));

module.exports = router;
