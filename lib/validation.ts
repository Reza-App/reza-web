/** Client side checks mirroring the backend rules (the backend stays authoritative). */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Same rule as the backend: +212 and 9 digits, or 0 and 9 digits. */
const PHONE_RE = /^(\+212\d{9}|0\d{9})$/;

export const PASSWORD_MIN_LENGTH = 8;

export function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '').trim();
}

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim()) && email.trim().length <= 254;
}

export function isValidPhone(phone: string): boolean {
  return PHONE_RE.test(normalizePhone(phone));
}

export const messages = {
  required: 'Ce champ est requis.',
  email: 'Adresse email invalide.',
  phone: 'Format attendu : +212XXXXXXXXX ou 0XXXXXXXXX.',
  password: `Au moins ${PASSWORD_MIN_LENGTH} caractères.`,
  passwordMatch: 'Les mots de passe ne correspondent pas.',
};

export type FieldErrors<K extends string> = Partial<Record<K, string>>;

/** Runs the rules and keeps the first failing message per field. */
export function validate<K extends string>(rules: Record<K, () => string | null>): FieldErrors<K> {
  const errors: FieldErrors<K> = {};
  for (const key of Object.keys(rules) as K[]) {
    const message = rules[key]();
    if (message) errors[key] = message;
  }
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}

/** Only internal dashboard paths are accepted as a post login destination. */
export function safeNextPath(next: string | null | undefined, fallback = '/dashboard/rendez-vous'): string {
  if (!next || !next.startsWith('/dashboard') || next.startsWith('//') || next.includes('\\')) return fallback;
  return next;
}
