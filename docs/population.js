export const SETTLER_MIN_POPULATION = 3;
export const SETTLER_RESIDENT_COST = 1;
export const SETTLER_WAITING = 'Waiting for ' + SETTLER_MIN_POPULATION + ' residents';

export function settlerPopulationReason(city, item = city?.queue?.item) {
  return item === 'settler' && city.population < SETTLER_MIN_POPULATION
    ? 'Settlers need ' + SETTLER_MIN_POPULATION + ' residents in this city.' : '';
}

// A stored unit of food can cover a later lean turn. A city can gain or lose
// at most one citizen per harvest and its founding household always remains.
export function housingCapacity(city) {
  return 3 + (city.buildings?.includes('granary') ? 2 : 0)
    + (city.buildings?.includes('neighborhood') ? 3 : 0);
}

export function foodForecast(city, harvest, bonusHousing = 0) {
  const population = city.population;
  const consumption = population * 2;
  const surplus = harvest - consumption;
  const food = Math.max(0, city.food || 0);
  const threshold = 6 + population * 2;
  const housing=housingCapacity(city) + bonusHousing;
  const housingLimited=population >= housing;
  return {
    population, food, harvest, consumption, surplus, threshold, housing, housingLimited,
    growthTurns: housingLimited || surplus < 0 ? null : food >= threshold ? 1 :
      surplus > 0 ? Math.max(1, Math.ceil((threshold - food) / surplus)) : null,
    starvationTurns: surplus < 0 && population > 1 ? Math.floor(food / -surplus) + 1 : null
  };
}

export function feedCity(city, report) {
  const remaining = report.food + report.surplus;
  if (remaining < 0) {
    city.food = 0;
    city.population = Math.max(1, city.population - 1);
  } else if (!report.housingLimited && report.surplus >= 0 && remaining >= report.threshold) {
    city.food = remaining - report.threshold;
    city.population++;
  } else {
    city.food = report.housingLimited ? Math.min(report.threshold,remaining) : remaining;
  }
}
