const moment = require('moment');

const getToday = () => moment().format("YYYY-MM-DD");
const getTomorrow = () => moment().add(1, 'days').format("YYYY-MM-DD");
const getUnixStartOfDay = (dateStr = null) => {
  const date = dateStr ? moment(dateStr, "DD-MM-YYYY") : moment();
  return date.startOf('day').unix();
};

const getUnixEndOfDay = (dateStr = null) => {
  const date = dateStr ? moment(dateStr, "DD-MM-YYYY") : moment();
  return date.endOf('day').unix();
};

const getClosestDate = (timestamp1, timestamp2) => {
  const now = moment().unix();
  const diff1 = Math.abs(now - timestamp1);
  const diff2 = Math.abs(now - timestamp2);

  return diff1 < diff2 ? timestamp1 : timestamp2;
};

const readableDate = (unixTimestamp) => {
  return moment.unix(unixTimestamp).format('DD-MM-YYYY HH:mm')

};

function isMarketOpenToday(nextMarketOpen, nextMarketClose) {
  const currentTime = moment().unix();
  const startOfToday = moment().startOf('day').unix();
  const endOfToday = moment().endOf('day').unix();
  // Verificar si el mercado está abierto actualmente
  if (currentTime >= nextMarketOpen && currentTime <= nextMarketClose) {
      return true;
  }

  // Verificar si el próximo horario de apertura o cierre está dentro del día de hoy
  if ((nextMarketOpen >= startOfToday && nextMarketOpen <= endOfToday) ||
      (nextMarketClose >= startOfToday && nextMarketClose <= endOfToday)) {
      return true;
  }

  return false;
}

module.exports = {
  getToday,
  getTomorrow,
  getUnixStartOfDay,
  getUnixEndOfDay,
  readableDate,
  getClosestDate,
  isMarketOpenToday
};