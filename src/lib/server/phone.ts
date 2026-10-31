import "server-only";
import { createHash } from "node:crypto";

export const hashCode = (phone: string, code: string) => createHash("sha256").update(`${phone}:${code}:${process.env.TWILIO_AUTH_TOKEN ?? ""}`).digest("hex");
