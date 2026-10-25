export function validateOrgName(name: string): { valid: boolean; error?: string; normalized: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: "Organization name is required.", normalized: "" };
  }
  const normalized = name.trim().normalize("NFKC");
  if (normalized.length < 2) {
    return { valid: false, error: "Organization name must be at least 2 characters.", normalized };
  }
  if (normalized.length > 255) {
    return { valid: false, error: "Organization name must not exceed 255 characters.", normalized };
  }
  // Control characters
  if (/[\x00-\x1F\x7F-\x9F]/.test(normalized)) {
    return { valid: false, error: "Organization name contains invalid control characters.", normalized };
  }
  // Zero-width characters
  if (/[\u200B-\u200D\uFEFF]/.test(normalized)) {
    return { valid: false, error: "Organization name contains invalid zero-width characters.", normalized };
  }
  return { valid: true, normalized };
}
