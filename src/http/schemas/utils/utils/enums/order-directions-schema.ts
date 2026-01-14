import { ORDER_DIRECTIONS } from "@custom-types/orderable";
import z from "zod";

export const orderDirectionsSchema = z.enum(ORDER_DIRECTIONS);
