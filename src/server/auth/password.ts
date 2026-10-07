import "server-only";
import { hash, verify } from "@node-rs/argon2";

// Argon2id with OWASP-recommended parameters (19 MiB, 2 iterations).
const OPTS = { memoryCost: 19456, timeCost: 2, parallelism: 1 } as const;

export function hashPassword(password: string) {
  return hash(password, OPTS);
}

export async function verifyPassword(hashValue: string, password: string) {
  try {
    return await verify(hashValue, password);
  } catch {
    return false;
  }
}

/** Constant-ish work for unknown emails so login timing doesn't reveal which emails exist. */
let dummyHash: Promise<string> | null = null;
export async function fakeVerify(password: string) {
  dummyHash ??= hash("dressify-timing-equaliser", OPTS);
  await verifyPassword(await dummyHash, password);
  return false;
}
