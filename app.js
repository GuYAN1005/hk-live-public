import { formatTemp, formatAqhi, nextTrain } from "./format.js";

// Small DOM helper: create an element with an optional class and text.
// textContent never parses markup, so fetched strings are safe to insert.
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

const FEED_URL =
  "https://data.weather.gov.hk/weatherAPI/opendata/weather.php?dataType=rhrread&lang=en";
const STATION = "Hong Kong Observatory";

const box = document.getElementById("weather");

function showUnavailable() {
  box.innerHTML =
    '<p class="wx-fail"><span class="wx-dash">—</span>Weather unavailable</p>';
}

function formatUpdateTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toLocaleString("en-HK", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Hong_Kong"
  });
}

async function loadWeather() {
  try {
    const res = await fetch(FEED_URL);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    const temp = formatTemp(data);
    if (temp === "--") {
      showUnavailable();
      return;
    }
    const updated = formatUpdateTime(data && data.temperature && data.temperature.recordTime);
    if (!updated) {
      showUnavailable();
      return;
    }
    box.replaceChildren();
    box.appendChild(el("p", "wx-loc", STATION));
    box.appendChild(el("p", "wx-temp", temp));
    box.appendChild(el("p", "wx-updated", "Updated " + updated));
  } catch (err) {
    showUnavailable();
  }
}

loadWeather();

// Air Quality: https://dashboard.data.gov.hk/api/aqhi-individual?format=json
const AQHI_URL =
  "https://dashboard.data.gov.hk/api/aqhi-individual?format=json";
const AQHI_STATION = "Central/Western";
const aqBox = document.getElementById("air-quality");

function showAirUnavailable() {
  aqBox.className = "air-quality";
  aqBox.innerHTML =
    '<p class="aq-fail"><span class="aq-dash">—</span>Air quality unavailable</p>';
}

function riskClass(risk) {
  const r = String(risk).toLowerCase();
  if (r.indexOf("low") !== -1) return "low";
  if (r.indexOf("moderate") !== -1) return "moderate";
  return "high";
}

function riskMarkerLeft(risk) {
  const c = riskClass(risk);
  if (c === "low") return "15%";
  if (c === "moderate") return "50%";
  return "85%";
}

async function loadAirQuality() {
  try {
    const res = await fetch(AQHI_URL);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    const aqhi = formatAqhi(data, AQHI_STATION);
    if (aqhi === "--") {
      showAirUnavailable();
      return;
    }
    // also need the risk label for the scale bar
    const station = Array.isArray(data)
      ? data.find(function (item) { return item.station === AQHI_STATION; })
      : null;
    const risk = station && station.health_risk ? station.health_risk : "";
    aqBox.className = "air-quality risk-" + riskClass(risk);
    aqBox.replaceChildren();
    aqBox.appendChild(el("p", "aq-station", AQHI_STATION));
    aqBox.appendChild(el("p", "aq-value", "AQHI " + aqhi));
    aqBox.appendChild(el("p", "aq-risk", risk));
    const scale = document.createElement("div");
    scale.className = "aq-scale";
    const marker = document.createElement("span");
    marker.className = "aq-marker";
    marker.style.left = riskMarkerLeft(risk);
    scale.appendChild(marker);
    aqBox.appendChild(scale);
  } catch (err) {
    showAirUnavailable();
  }
}

loadAirQuality();

// Transport: MTR Island Line (ISL) schedule at HKU station, UP direction.
const MTR_URL =
  "https://rt.data.gov.hk/v1/transport/mtr/getSchedule.php?line=ISL&sta=HKU";
const tpBox = document.getElementById("transport");

function showTransportUnavailable() {
  tpBox.innerHTML =
    '<p class="tp-fail"><span class="tp-dash">—</span>Transport unavailable</p>';
}

function formatTrainTime(datetime) {
  const match = /^\d{4}-\d{2}-\d{2} (\d{2}:\d{2})/.exec(datetime);
  return match ? match[1] : datetime;
}

async function loadTransport() {
  try {
    const res = await fetch(MTR_URL);
    if (!res.ok) {
      throw new Error("HTTP " + res.status);
    }
    const data = await res.json();
    const minutes = nextTrain(data);
    if (minutes === "--") {
      showTransportUnavailable();
      return;
    }
    // Build the full train list from the raw data (display detail stays here).
    const trains = data && data.data && data.data["ISL-HKU"] && data.data["ISL-HKU"].UP;
    const validTrains = Array.isArray(trains)
      ? trains.filter(function (t) { return t && t.valid === "Y"; })
      : [];
    if (validTrains.length === 0) {
      showTransportUnavailable();
      return;
    }
    tpBox.replaceChildren();
    validTrains.forEach(function (t) {
      const arrivesIn = Number(t.ttnt) + 1;
      const cars = Number(t.plat) + 1;

      const row = document.createElement("div");
      row.className = "tp-train";

      const top = document.createElement("div");
      top.className = "tp-top";
      top.appendChild(el("span", "tp-seq", "Train " + t.seq));
      top.appendChild(el("span", "tp-dest", "to " + t.dest));

      const meta = document.createElement("div");
      meta.className = "tp-meta";

      const timeSpan = el("span", "", "Time ");
      const timeB = document.createElement("b");
      timeB.textContent = formatTrainTime(t.time);
      timeSpan.appendChild(timeB);

      const arrSpan = el("span", "", "Arrives in ");
      const arrB = document.createElement("b");
      arrB.textContent = String(arrivesIn);
      arrSpan.appendChild(arrB);
      arrSpan.appendChild(document.createTextNode(" min"));

      const carsSpan = el("span", "", "Cars ");
      const carsB = document.createElement("b");
      carsB.textContent = String(cars);
      carsSpan.appendChild(carsB);

      meta.append(timeSpan, arrSpan, carsSpan);
      row.append(top, meta);
      tpBox.appendChild(row);
    });
  } catch (err) {
    showTransportUnavailable();
  }
}

loadTransport();

// Refresh buttons: re-run the matching loader and show a skeleton while it fetches.
document.querySelectorAll(".refresh").forEach(function (btn) {
  btn.addEventListener("click", function () {
    const card = btn.closest(".card");
    const which = card ? card.getAttribute("data-card") : "";
    if (which === "weather") {
      box.innerHTML = '<div class="skeleton"></div>';
      loadWeather();
    } else if (which === "transport") {
      tpBox.innerHTML = '<div class="skeleton"></div>';
      loadTransport();
    } else if (which === "air-quality") {
      aqBox.className = "air-quality";
      aqBox.innerHTML = '<div class="skeleton"></div>';
      loadAirQuality();
    }
  });
});

// ---- Fun interactions ----

// Card spotlight: glow follows the cursor inside each card.
document.querySelectorAll(".card").forEach(function (card) {
  card.addEventListener("mousemove", function (e) {
    const r = card.getBoundingClientRect();
    card.style.setProperty("--mx", (e.clientX - r.left) + "px");
    card.style.setProperty("--my", (e.clientY - r.top) + "px");
  });
});

// Click anywhere -> a mini neon firework burst.
const SPARK_COLORS = ["#5eead4", "#7dd3fc", "#ffd166", "#f87171", "#f472b6"];
document.addEventListener("click", function (e) {
  const count = 14;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    p.className = "spark";
    p.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const dist = 40 + Math.random() * 55;
    p.style.left = e.clientX + "px";
    p.style.top = e.clientY + "px";
    p.style.setProperty("--dx", Math.cos(angle) * dist + "px");
    p.style.setProperty("--dy", Math.sin(angle) * dist + "px");
    document.body.appendChild(p);
    setTimeout(function () { p.remove(); }, 850);
  }
});

// Floating neon dots in the side margins.
const orbField = document.createElement("div");
orbField.className = "orb-field";
document.body.appendChild(orbField);
for (let i = 0; i < 14; i++) {
  const o = document.createElement("div");
  o.className = "orb";
  o.style.left = Math.random() * 100 + "vw";
  o.style.top = Math.random() * 100 + "vh";
  o.style.background = SPARK_COLORS[i % SPARK_COLORS.length];
  o.style.animationDuration = 8 + Math.random() * 10 + "s";
  o.style.animationDelay = -Math.random() * 10 + "s";
  orbField.appendChild(o);
}

// ---- Frog: pupils track the cursor ----
const frog = document.querySelector(".frog");
const pupils = document.querySelectorAll(".pupil");
const pupilBases = [44, 56]; // resting cx of each eye

document.addEventListener("mousemove", function (e) {
  pupils.forEach(function (p, i) {
    const r = p.getBoundingClientRect();
    const eyeX = r.left + r.width / 2;
    const eyeY = r.top + r.height / 2;
    const dx = e.clientX - eyeX;
    const dy = e.clientY - eyeY;
    const angle = Math.atan2(dy, dx);
    const max = 2.5;
    p.setAttribute("cx", pupilBases[i] + Math.cos(angle) * max);
    p.setAttribute("cy", 19 + Math.sin(angle) * max);
  });
});

// On any click, the frog breaks into its signature laugh.
document.addEventListener("click", function () {
  if (!frog) return;
  frog.classList.remove("laughing");
  void frog.offsetWidth; // restart animation
  frog.classList.add("laughing");
  setTimeout(function () {
    frog.classList.remove("laughing");
  }, 750);
});
