/** Egyptian mobile number in the local 11-digit form stored on customers. */
export const EGYPT_MOBILE = /^(01)[0-9]{9}$/;

/**
 * Normalise any common WhatsApp/Meta form (2010…, +2010…, 002010…, 010…)
 * to the 11-digit local form, e.g. `01012345678`.
 */
export function toLocalEgyptPhone(raw: string): string {
  let digits = (raw || "").replace(/\D/g, "");
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20")) digits = digits.slice(2);
  if (!digits.startsWith("0")) digits = "0" + digits;
  return digits;
}
