// ScrumArt — модуль Scrum. Точка входа приложения на Express.
const path = require('path');
const express = require('express');
const pkg = require('./package.json');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));

// Название, описание и версия — одни и те же на странице и в package.json
const product = {
  name: 'ScrumArt — модуль Scrum',
  description:
    'Веб-сервис для небольших студий видеопродакшена: продюсер ведёт бэклог проекта, ' +
    'планирует спринты, а режиссёр, оператор и монтажёр видят свои задачи на Scrum-доске ' +
    'вместо переписки в чатах и таблиц.',
  version: pkg.version,
};

app.get('/', (req, res) => {
  res.render('index', { product });
});

// 0.0.0.0 — чтобы страница открывалась снаружи контейнера
app.listen(PORT, '0.0.0.0', () => {
  console.log(`${product.name} ${product.version} запущен: http://localhost:${PORT}`);
});
