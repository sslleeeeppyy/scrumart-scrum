// Express 4 не ловит ошибки async-обработчиков: передаём их в next(),
// чтобы ошибка базы показала страницу 500, а не уронила процесс.
const ah = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { ah };
