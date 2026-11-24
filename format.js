// format.js — pure display logic.
// No fetch, no DOM. Takes raw JSON, returns a display string.

const WEATHER_STATION = "Hong Kong Observatory";
const MTR_KEY = "ISL-HKU";

// Weather: pull the temperature reading for the fixed station.
// Returns e.g. "21 °C" or "--" if the station list is missing, empty, or the
// station / value is not present.
export function formatTemp(data) {
  const records = data && data.temperature && data.temperature.data;
  if (!Array.isArray(records) || records.length === 0) return "--";
  const station = records.find(function (item) {
    return item.place === WEATHER_STATION;
  });
  if (!station || station.value === undefined || station.value === null) return "--";
  const unit = station.unit === "C" ? "°C" : station.unit;
  return station.value + " " + unit;
}

// Air quality: pull the AQHI number for the named station.
// Returns e.g. "4" or "--" if the list is missing, the station is absent,
// or aqhi is null/undefined.
export function formatAqhi(data, stationName) {
  if (!Array.isArray(data)) return "--";
  const station = data.find(function (item) {
    return item.station === stationName;
  });
  if (!station || station.aqhi === undefined || station.aqhi === null) return "--";
  return String(station.aqhi);
}

// Transport: minutes until the next valid UP train from HKU.
// Returns e.g. "219" or "--" when the feed status is not 1, the train list is
// missing, or no train is valid. Converts ttnt from a string before + 1.
export function nextTrain(data) {
  const status = data && data.status;
  const trains =
    data && data.data && data.data[MTR_KEY] && data.data[MTR_KEY].UP;
  if (status !== 1 || !Array.isArray(trains)) return "--";
  const valid = trains.filter(function (t) {
    return t && t.valid === "Y";
  });
  if (valid.length === 0) return "--";
  const minutes = Number(valid[0].ttnt) + 1;
  if (Number.isNaN(minutes)) return "--";
  return String(minutes);
}
