import type { DurationString } from "./duration-string-type";

export interface RateLimitInput {
	max?: number;
	timeWindow?: DurationString;
}
