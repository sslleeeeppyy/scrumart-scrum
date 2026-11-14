// ScrumArt — модуль Scrum. Точка входа приложения на Express.
const path = require('path');
const express = require('express');
const pkg = require('./package.json');
const db = require('./data/db');
const { ah } = require('./routes/util');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
// Bootstrap и иконки раздаются из node_modules внутри образа — без CDN, страницы открываются без интернета
app.use('/vendor/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/vendor/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons/font')));
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

const fmtDate = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('.') : '');

// Общие данные для всех шаблонов: продукт, текущий спринт, текущий пользователь
app.use(ah(async (req, res, next) => {
  const [sprint, users] = await Promise.all([db.currentSprint(), db.getUsers()]);
  Object.assign(res.locals, {
    product, path: req.path, fmtDate, sprint, users,
    currentUser: users[0], // демо-вход: продюсер (входа в систему в этой версии нет)
    FIBONACCI: db.FIBONACCI, PRIORITIES: db.PRIORITIES, STATUSES: db.STATUSES,
  });
  next();
}));

app.get('/', ah(async (req, res) => {
  const backlog = await db.backlogTasks();
  res.render('index', { title: 'Главная', backlogCount: backlog.length });
}));

app.use(require('./routes/backlog'));
app.use(require('./routes/sprint'));

// Несуществующий адрес или запись
app.use((req, res) => {
  res.status(404).render('not-found', { title: 'Страница не найдена' });
});

// Ошибка базы или кода — понятная страница вместо падения процесса
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send(
    `<!doctype html><meta charset="utf-8"><title>Ошибка · ${product.name}</title>` +
    '<link rel="stylesheet" href="/vendor/bootstrap/css/bootstrap.min.css">' +
    '<div class="container py-5"><h1 class="h3">Сервис временно недоступен</h1>' +
    '<p class="text-secondary">Не удалось обратиться к базе данных. Попробуйте обновить страницу.</p>' +
    '<a class="btn btn-primary" href="/">На главную</a></div>',
  );
});

// Сначала дожидаемся базы и создаём схему, потом принимаем запросы.
// 0.0.0.0 — чтобы страница открывалась снаружи контейнера.
db.init()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`${product.name} ${product.version} запущен: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Не удалось подключиться к базе:', err.message);
    process.exit(1);
  });
