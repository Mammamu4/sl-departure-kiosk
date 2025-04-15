export const transportCategoryMap = {
  4: "Train",
  5: "Metro",
  6: "Tram",
  7: "Buss",
};

export interface DepartureConfig {
  name: string;
  id: number;
  displayedDepartures: number[];
}

export interface Departure {
  line: number; // displayNumber
  time: string; // departureTime
  timeLeft: number;
  station: string; // stop
  direction: string; // destination
  transportCategory: string;
}
