export type InputFormat = 'phone' | 'pincode' | 'gstin' | 'pan' | 'ifsc' | 'uppercase' | 'vehicle_number' | 'decimal' | 'integer';

export function cleanInput(value: string, format?: InputFormat, maxLength?: number) {
  let cleaned = value;
  if (format === 'phone') cleaned = value.replace(/\D/g, '').slice(0, 10);
  if (format === 'pincode') cleaned = value.replace(/\D/g, '').slice(0, 6);
  if (format === 'integer') cleaned = value.replace(/\D/g, '');
  if (format === 'decimal') {
    cleaned = value.replace(/[^\d.]/g, '');
    const [whole, ...fraction] = cleaned.split('.');
    cleaned = fraction.length ? `${whole}.${fraction.join('').slice(0, 2)}` : whole;
  }
  if (format === 'gstin') cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 15);
  if (format === 'pan') cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  if (format === 'ifsc') cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
  if (format === 'vehicle_number') cleaned = value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').replace(/\s+/g, ' ').slice(0, 20);
  if (format === 'uppercase') cleaned = value.toUpperCase();
  return maxLength ? cleaned.slice(0, maxLength) : cleaned;
}

export function validationProps(format?: InputFormat) {
  if (format === 'phone') return { inputMode: 'numeric' as const, maxLength: 10, minLength: 10, pattern: '[0-9]{10}', title: 'Enter exactly 10 digits' };
  if (format === 'pincode') return { inputMode: 'numeric' as const, maxLength: 6, minLength: 6, pattern: '[0-9]{6}', title: 'Enter exactly 6 digits' };
  if (format === 'gstin') return { maxLength: 15, minLength: 15, pattern: '[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]', title: 'Enter a valid 15-character GSTIN' };
  if (format === 'pan') return { maxLength: 10, minLength: 10, pattern: '[A-Z]{5}[0-9]{4}[A-Z]', title: 'Enter a valid PAN (example: ABCDE1234F)' };
  if (format === 'ifsc') return { maxLength: 11, minLength: 11, pattern: '[A-Z]{4}0[A-Z0-9]{6}', title: 'Enter a valid 11-character IFSC code' };
  if (format === 'vehicle_number') return { maxLength: 14, minLength: 11, pattern: '[A-Z]{2}\\s[0-9]{2}\\s[A-Z]{2}\\s[0-9]{1,4}', title: 'Enter a valid vehicle number like TN 31 CM 0000' };
  if (format === 'integer') return { inputMode: 'numeric' as const, pattern: '[0-9]*', title: 'Enter numbers only' };
  if (format === 'decimal') return { inputMode: 'decimal' as const, pattern: '[0-9]+([.][0-9]{1,2})?', title: 'Enter a valid non-negative number' };
  return {};
}
