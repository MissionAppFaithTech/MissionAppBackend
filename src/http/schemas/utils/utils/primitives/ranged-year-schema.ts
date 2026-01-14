import { VALID_DATE_RANGE_YEARS } from "@constants/validation-constants";
import { INVALID_DATE_RANGE } from "src/messages/validation";
import z from "zod";

export const rangedYearSchema = z
	.number()
	.int()
	.refine(
		(data) => {
			const currentYear = new Date().getFullYear();

			return (
				data <= currentYear && data >= currentYear - VALID_DATE_RANGE_YEARS
			);
		},
		{
			error: INVALID_DATE_RANGE,
		},
	);
