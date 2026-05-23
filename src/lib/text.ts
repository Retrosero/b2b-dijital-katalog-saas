export function fixMojibake(input: string): string {
  let value = String(input || "");
  if (!value) return value;

  // Try latin1->utf8 recovery for common mojibake payloads.
  if (/[ÃÅÄÂ]/.test(value)) {
    try {
      const bytes = Uint8Array.from([...value].map((ch) => ch.charCodeAt(0) & 0xff));
      const decoded = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      const originalScore = (value.match(/[ÃÅÄÂ]/g) || []).length;
      const decodedScore = (decoded.match(/[ÃÅÄÂ]/g) || []).length;
      if (decodedScore < originalScore) value = decoded;
    } catch {
      // no-op
    }
  }

  // Repair known broken notification tokens that cannot be recovered by re-decoding.
  const replacements: Array<[RegExp, string]> = [
    [/Sipari�x/g, "Sipariş"],
    [/sipari�x/g, "sipariş"],
    [/Sipari��/g, "Sipariş"],
    [/sipari��/g, "sipariş"],
    [/SipariÝ/g, "Sipariş"],
    [/sipariÝ/g, "sipariş"],
    [/B�_ra/g, "Büşra"],
    [/\^AMP/g, "ŞAMP"],
    [/\^/g, "Ş"],
    [/Ã¼/g, "ü"],
    [/Ãœ/g, "Ü"],
    [/Ä±/g, "ı"],
    [/Ä°/g, "İ"],
    [/ÅŸ/g, "ş"],
    [/Åž/g, "Ş"],
    [/Ã¶/g, "ö"],
    [/Ã–/g, "Ö"],
    [/Ã§/g, "ç"],
    [/Ã‡/g, "Ç"],
    [/ÄŸ/g, "ğ"],
    [/Äž/g, "Ğ"]
  ];

  for (const [pattern, replacement] of replacements) {
    value = value.replace(pattern, replacement);
  }

  // Collapse any remaining replacement chars to avoid noisy UI.
  value = value.replace(/�+/g, "");

  return value;
}
