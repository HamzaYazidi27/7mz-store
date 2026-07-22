import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/** Unambiguous alphabet for human-facing codes (no 0/O, 1/I/L). */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

/**
 * CryptoService — AES-256-GCM encryption for secrets at rest (stock item
 * contents, 2FA secrets, withdrawal destinations), plus hashing and
 * human-friendly code generation.
 */
@Injectable()
export class CryptoService {
  private readonly key: Buffer;

  constructor(config: ConfigService) {
    this.key = Buffer.from(config.getOrThrow<string>("encryption.key"), "hex");
  }

  /** Encrypts plaintext → base64(iv | authTag | ciphertext). */
  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
    return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
  }

  /** Decrypts base64(iv | authTag | ciphertext) → plaintext. */
  decrypt(payload: string): string {
    const raw = Buffer.from(payload, "base64");
    const iv = raw.subarray(0, IV_LENGTH);
    const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  }

  sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  safeEqual(a: string, b: string): boolean {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
  }

  /** Cryptographically random URL-safe token. */
  randomToken(bytes = 32): string {
    return randomBytes(bytes).toString("base64url");
  }

  /** Human-friendly code, e.g. referral codes: "7KQ4MZ9P". */
  randomCode(length = 8): string {
    const bytes = randomBytes(length);
    let code = "";
    for (let i = 0; i < length; i += 1) {
      code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    }
    return code;
  }

  /** Order number: 7MZ-K4Q2M9. */
  orderNumber(prefix = "7MZ"): string {
    return `${prefix}-${this.randomCode(6)}`;
  }

  /** Ticket number: TKT-8Q3ZK7. */
  ticketNumber(prefix = "TKT"): string {
    return `${prefix}-${this.randomCode(6)}`;
  }
}
