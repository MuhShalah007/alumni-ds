import { drizzle } from "drizzle-orm/d1";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./schema";
import type { AdminSession } from "@shared/constants";

export interface Env {
  DB: D1Database;
  PHOTOS: R2Bucket;
  RATE_LIMIT: KVNamespace;
  ASSETS: Fetcher;
  JWT_SECRET: string;
  APP_BASE_URL: string;
}

export interface AppContext {
  Bindings: Env;
  Variables: {
    admin?: AdminSession;
  };
}

export type Database = DrizzleD1Database<typeof schema>;

export function createDb(d1: D1Database): Database {
  return drizzle(d1, { schema });
}
