#!/usr/bin/env node
/**
 * Print a random TICKET_HMAC_SECRET for .env.local
 * Usage: npm run secret:hmac
 */
import { randomBytes } from "crypto";
import { loadEnv } from "./load-env.mjs";

loadEnv();

const secret = randomBytes(32).toString("base64url");
console.log("Add this line to .env.local:\n");
console.log(`TICKET_HMAC_SECRET=${secret}`);
