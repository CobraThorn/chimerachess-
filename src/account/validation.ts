export function isValidEmail(email: string): boolean {
  const t = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) && t.length <= 254;
}

export function isValidPhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.startsWith("1") && digits.length === 11) return `+${digits}`;
  return digits.length > 0 ? `+${digits}` : "";
}

export function isValidPassword(
  password: string
): { ok: true; password: string } | { ok: false; error: string } {
  const p = password;
  if (p.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (p.length > 128) {
    return { ok: false, error: "Password is too long." };
  }
  return { ok: true, password: p };
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visible = user.slice(0, Math.min(2, user.length));
  return `${visible}***@${domain}`;
}
