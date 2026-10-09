// Бэклог: просмотр, создание задачи, перенос задачи в спринт (с проверкой ёмкости)
const express = require('express');
const db = require('../data/project');

const router = express.Router();

// Просмотр бэклога
router.get('/backlog', (req, res) => {
  res.render('backlog', {
    title: 'Бэклог',
    tasks: db.backlogTasks(),
    created: Number(req.query.created) || null,
  });
});

// Форма новой задачи
router.get('/tasks/new', (req, res) => {
  res.render('task-new', { title: 'Новая задача', errors: [], form: {} });
});

// Создание задачи в бэклоге (изменение данных)
router.post('/tasks', (req, res) => {
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
  if (form.assigneeId !== null && !db.users.some((u) => u.id === form.assigneeId)) {
    errors.push('Выбранный исполнитель не входит в команду проекта.');
  }

  if (errors.length) {
    return res.status(422).render('task-new', { title: 'Новая задача', errors, form: req.body });
  }

  const task = db.addTask(form);
  res.redirect(303, `/backlog?created=${task.id}`);
});

// Перенос задачи из бэклога в текущий спринт
router.post('/backlog/:id/to-sprint', (req, res, next) => {
  const task = db.findTask(Number(req.params.id));
  if (!task || task.sprint) return next(); // нет такой задачи в бэклоге → 404

  const load = db.sprintLoad();
  if (load + task.storyPoints > db.sprint.capacity) {
    // Бизнес-правило Scrum: нельзя брать в спринт больше, чем команда успевает
    return res.redirect(303, `/sprint-overload?task=${task.id}`);
  }

  task.sprint = true;
  task.status = 'К выполнению';
  res.redirect(303, `/sprint?added=${task.id}`);
});

module.exports = router;
