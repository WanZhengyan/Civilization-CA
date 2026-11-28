// Only new campaigns receive the opening towns. Existing saves keep their cities.
export const AI_STARTING_CITIES=Object.freeze({easy:1,normal:3,hard:5});
export const AI_LEVELS=Object.freeze(['easy','normal','hard']);
export const validDifficulty=value=>AI_LEVELS.includes(value);
