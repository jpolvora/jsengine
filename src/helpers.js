const moment = require('moment');

function roundDown(number, decimals = 2) {
  return (Math.floor(number * Math.pow(10, decimals)) / Math.pow(10, decimals));
}

const fMoney = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

const formatNumber = new Intl.NumberFormat("pt-BR");

const formatPercent = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

module.exports = {
  moment,
  formatMoney: function (val) {
    return fMoney.format(roundDown(val, 2));
  },
  formatNumber: function (val) {
    return formatNumber.format(val);
  },
  formatPercent: function (val) {
    return formatPercent.format(val);
  }
}