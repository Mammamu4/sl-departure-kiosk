interface ImportMetaEnv {
  readonly VITE_RESROBOT_API_BASE_URL: string;
  readonly VITE_RESROBOT_ACCESS_ID: string;
  readonly VITE_UPDATE_FREQUENCY: string;
  readonly VITE_API_DURATION: string;
}

const {
  VITE_RESROBOT_API_BASE_URL,
  VITE_RESROBOT_ACCESS_ID,
  VITE_UPDATE_FREQUENCY,
  VITE_API_DURATION,
} = import.meta.env as unknown as ImportMetaEnv;

if (
  !VITE_RESROBOT_API_BASE_URL ||
  !VITE_RESROBOT_ACCESS_ID ||
  !VITE_UPDATE_FREQUENCY ||
  !VITE_API_DURATION
) {
  console.error("Required environment variables are missing");
  throw new Error("Required environment variables are missing");
}

const RESROBOT_API_BASE_URL = VITE_RESROBOT_API_BASE_URL;
const RESROBOT_ACCESS_ID = VITE_RESROBOT_ACCESS_ID;

const UPDATE_FREQUENCY = Number(VITE_UPDATE_FREQUENCY);
const API_DURATION = Number(VITE_API_DURATION);

const MIN_TIME_DIFFERENCE = 8;

import { DepartureConfig } from "./types";
import { Departure } from "./types";
import departureConfigs from "./config/departures.json";
import { transportCategoryMap } from "./types";

const departureConfigurations: DepartureConfig[] = departureConfigs;

const fetchDepartures = async (): Promise<Departure[] | undefined> => {
  const departures: Departure[] = await Promise.all(
    departureConfigurations.map(async (config) => {
      const response = await fetch(
        `${RESROBOT_API_BASE_URL}?accessId=${RESROBOT_ACCESS_ID}&format=json&id=${config.id}&duration=${API_DURATION}`
      );
      if (!response.ok) {
        throw new Error(`API Error: ${response.statusText}`);
      }
      const data = await response.json();
      return data.Departure.map((departure: any) => ({
        line: departure.ProductAtStop.line,
        time: departure.time,
        timeLeft: parseTimeDifference(
          departure.date + "T" + departure.time + "+02:00"
        ),
        station: config.name,
        direction: departure.direction.replace(/\s*\(.*?\)/g, ""),
        transportCategory:
          transportCategoryMap[
            departure.ProductAtStop.catCode as keyof typeof transportCategoryMap
          ] || "Unknown",
      })).filter((departure: Departure) =>
        filterDeparture(departure, config.displayedDepartures)
      );
    })
  );
  return departures.flat().sort((a, b) => a.timeLeft - b.timeLeft);
};

const filterDeparture = (
  departure: Departure,
  displayedDepartures: number[]
): boolean => {
  return (
    departure.timeLeft >= MIN_TIME_DIFFERENCE &&
    departure.direction != "Akalla T-bana" &&
    displayedDepartures.includes(Number(departure.line))
  );
};

const parseTimeDifference = (departureDateString: string): number => {
  const now: Date = new Date();
  const departureDate: Date = new Date(departureDateString);

  if (departureDate < now) {
    return -1;
  }
  const differenceInMs: number = departureDate.getTime() - now.getTime();

  return Math.floor(differenceInMs / 60000);
};

const displayDepartures = (departures: Departure[]): void => {
  const tbodyBuss = document.querySelector<HTMLTableSectionElement>("#buss");
  const tbodyTrain = document.querySelector<HTMLTableSectionElement>("#train");

  if (!tbodyBuss || !tbodyTrain) return;

  tbodyBuss.innerHTML = "";
  tbodyTrain.innerHTML = "";

  const maxBussRows = 5
  const maxTrainRows = 5

  const bussDepartures = departures.filter(
    (departure) => departure.transportCategory === "Buss"
  );
  const trainDepartures = departures.filter(
    (departure) =>
      departure.transportCategory === "Train" ||
      departure.transportCategory === "Metro" ||
      departure.transportCategory === "Tram"
  );

  const limitedBussDepartures = bussDepartures.slice(0, maxBussRows);
  const limitedTrainDepartures = trainDepartures.slice(0, maxTrainRows);
  console.log(limitedBussDepartures);
  console.log(limitedTrainDepartures);

  const appendRows = (
    tbody: HTMLTableSectionElement,
    departures: Departure[]
  ) => {
    departures.forEach((departure) => {
      const tr = document.createElement("tr");

      const icon = document.createElement("td");
      const img = document.createElement("img");
      img.src = getIcon(departure.transportCategory);
      img.classList.add("icon");
      icon.appendChild(img);
      tr.appendChild(icon);

      const line = document.createElement("td");
      const lineSpan = document.createElement("span")
      lineSpan.textContent = departure.line.toString();
      lineSpan.style.backgroundColor = `var(--${departure.transportCategory.toLowerCase()}-color)`;
      line.classList.add("line");
      line.appendChild(lineSpan);
      tr.appendChild(line);

      const time = document.createElement("td");
      time.textContent = departure.time.slice(0, 5);
      time.classList.add("time");
      tr.appendChild(time);

      const station = document.createElement("td");
      station.textContent = departure.station;
      station.classList.add("station");
      tr.appendChild(station);

      const direction = document.createElement("td");
      direction.textContent = departure.direction;
      direction.classList.add("direction");
      tr.appendChild(direction);

      const timeLeft = document.createElement("td");
      timeLeft.textContent = `${departure.timeLeft} min`;
      timeLeft.classList.add(departure.timeLeft <= 10 ? "red-text" : "green");
      timeLeft.classList.add("time-left");
      tr.appendChild(timeLeft);

      tbody.appendChild(tr);
    });
  };

  appendRows(tbodyBuss, limitedBussDepartures);
  appendRows(tbodyTrain, limitedTrainDepartures);
};

const getIcon = (transportCategoryMap: string): string => {
  switch (transportCategoryMap) {
    case "Buss":
      return "/buss.svg";
    case "Metro":
      return "/tunnelbana.svg";
    default:
      return "/spår.svg";
  }
};

const run = async (): Promise<void> => {
  const results = await fetchDepartures();
  if (results) {
    console.log(results);
    displayDepartures(results);
  }
};

run();

setInterval(run, UPDATE_FREQUENCY);
