// No-op Babel plugin. Возвращаем пустой visitor — Babel принимает его и ничего не делает.
module.exports = function noopWorkletsPlugin() {
  return { visitor: {} };
};
