export const ORDER_DIRECTIONS = ["asc", "desc"] as const;
export const COMPARISON_OPERATORS = [
	"equals",
	"gt",
	"gte",
	"lt",
	"lte",
] as const;

export type OrderableType = (typeof ORDER_DIRECTIONS)[number];
export type ComparableType = (typeof COMPARISON_OPERATORS)[number];
