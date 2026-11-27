// Difficulty changes the orders a computer chooses, never the campaign rules.
export const AI_LEVELS=Object.freeze(['easy','normal','hard']);
export const validDifficulty=value=>AI_LEVELS.includes(value);
