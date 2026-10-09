// ScrumArt — модуль Scrum. Точка входа приложения на Express.
const path = require('path');
const express = require('express');
const pkg = require('./package.json');
const db = require('./data/project');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));

// Название, описание и версия — одни и те же на всех страницах и в package.json
const product = {
  name: 'ScrumArt — модуль Scrum',
  description:
    'Веб-сервис для небольших студий видеопродакшена: продюсер ведёт бэклог проекта, ' +
    'планирует спринты, а режиссёр, оператор и монтажёр видят свои задачи на Scrum-доске ' +
    'вместо переписки в чатах и таблиц.',
  version: pkg.version,
};

// Общие данные для всех шаблонов (шапка, подвал, текущий пользователь)
app.use((req, res, next) => {
  res.locals.product = product;
  res.locals.db = db;
  res.locals.path = req.path;
  res.locals.currentUser = db.users[0]; // демо-вход: продюсер
  next();
});

app.get('/', (req, res) => {
  res.render('index', {
    title: 'Главная',
    load: db.sprintLoad(),
    done: db.sprintDone(),
    backlogCount: db.backlogTasks().length,
  });
});

app.use(require('./routes/backlog'));
app.use(require('./routes/sprint'));

// Несуществующий адрес или запись
app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Страница не найдена' });
});

// 0.0.0.0 — чтобы страница открывалась снаружи контейнера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${product.name} ${product.version} запущен: http://localhost:${PORT}`);
});
