const moment = require('moment'),
  path = require('path'),
  fs = require('fs'),
  util = require('util'),
  stat = util.promisify(fs.stat),
  write = util.promisify(fs.writeFile),
  read = util.promisify(fs.readFile);

function roundDown(number, decimals = 2) {
  return (Math.floor(number * Math.pow(10, decimals)) / Math.pow(10, decimals));
}

const fMoney = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const fNumber = new Intl.NumberFormat('pt-BR');

const fPercent = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatMoney(val) {
  return fMoney.format(roundDown(val, 2));
}

function formatNumber(val) {
  return fNumber.format(val);
}

function formatPercent(val) {
  return fPercent.format(roundDown(val, 3));
}

function repeat(count, callback) {
  let str = '';
  for (let i = 0; i < count; i++) {
    str += callback(i) || '0';
  }

  return str;
}

function randomFromArray(items = [], cb) {
  const item = items[Math.floor(Math.random() * items.length)];
  return cb(item);
}
function whilePop(items, cb) {
  while (items.length > 0) {
    return cb(items.pop());
  }
}

function nextRandom(iterable = [], cb) {
  let current = undefined;

  function getNext() {
    return randomFromArray(iterable, (item) => {
      current = item;
      return item;
    });
  }

  function getCurrent() {
    if (!current) return getNext();
    return current;
  }

  return cb(getNext, getCurrent);
}
function next(iterable = [], cb) {
  const count = iterable.length;
  let i = 0;
  let current = undefined;
  function getNext() {
    if (!current) return getCurrent();
    i++;
    if (i >= count) i = 0;
    return getCurrent();
  }

  function getCurrent() {
    current = iterable[i];
    return current;
  }

  return cb(getNext, getCurrent);
}

function pipelines() {

}

function counterReset(count, callback) {
  let i = 0;
  function incrementor(cb, onStart, onEnd) {
    i++;
    let result = '';
    if (i === 1) {
      result += onStart.call(null);
    }

    result += cb.call(null, i);

    if (i === count) {
      i = 0;
      result += onEnd.call(null);
    }

    return result;
  }

  return callback(incrementor);
}

function ternary(exprCompare, callbackTrue, callbackFalse) {
  const fnTrue = typeof callbackTrue === "function" ? callbackTrue : () => callbackTrue || '';
  const fnFalse = typeof callbackFalse === "function" ? callbackFalse : () => callbackFalse || '';
  try {
    if (!!exprCompare === true) return fnTrue.call(null);
    else return fnFalse.call(null);
  } catch (e) {
    return e.message;
  }
}

function loop(iterable, callback) {
  let str = '';
  for (let i = 0; i < iterable.length; i++) {
    const element = iterable[i];
    str += callback(element, i || 0) || '';
  }
  return str;
}

function insertScript(html, src) {
  return html`<script type="text/javascript" src="${src}"></script>`;
}

function insertStyle(html, href) {
  return html`<link rel="stylesheet" href="${href}" />`;
}

async function concatAndWrite(fileName, files) {
  const buffer = [];
  const dir = path.dirname(fileName);

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fullPath = path.combine(dir, file);
    const lines = await read(file).split('\n');
    buffer.push(...lines);
  }

  await write(fileName, buffer.toString());
}

async function createBundle(path, refresh = false, files = []) {
  const s = await stat(path);
  if (s.error || refresh) {
    await concatAndWrite(fileName, files);
  }
}

/**
 * Provides a shared object to inject functions available for views and layouts
 */
const shared = {}

module.exports = (html) => ({
  shared,
  moment,
  formatMoney,
  formatNumber,
  formatPercent,
  ternary,
  loop,
  whilePop,
  randomFromArray,
  repeat,
  next,
  nextRandom,
  counterReset,
  insertScript: insertScript.bind(null, html),
  insertStyle: insertStyle.bind(null, html),
  createBundle
})