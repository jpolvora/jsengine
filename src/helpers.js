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
  return fMoney.format(val);
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

function forEach(iterable, callback) {
  let str = '';
  for (let i = 0; i < iterable.length; i++) {
    const element = iterable[i];
    str += callback(element, i || 0) || '';
  }
  return str;
}

function insertScript(html: Function, src: String) {
  return html`<script type="text/javascript" src="${src}"></script>`;
}

function insertStyle(html, href) {
  return `<link rel="stylesheet" href="${href}" />`;
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


module.exports = (html) => ({
  moment,
  formatMoney,
  formatNumber,
  formatPercent,
  forEach,
  repeat,
  insertScript: insertScript.bind(null, html),
  insertStyle: insertStyle.bind(null, html),
  createBundle
})