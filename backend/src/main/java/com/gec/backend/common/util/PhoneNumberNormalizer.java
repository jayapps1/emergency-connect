package com.gec.backend.common.util;

/**
 * Utility service for normalizing Ghana telephone numbers into a canonical international E.164-style format (+233XXXXXXXXX).
 *
 * <p>Normalization Rules:
 * <ul>
 *   <li>Short emergency service codes (e.g. 112, 192, 191, 193) are preserved as raw digits without modifications.</li>
 *   <li>Ghana national numbers formatted with leading trunk zero {@code 05XXXXXXXX} (10 digits) are converted to {@code +2335XXXXXXXX}.</li>
 *   <li>Ghana national numbers typed without trunk zero {@code 5XXXXXXXX} (9 digits) are prefixed with {@code +233}.</li>
 *   <li>Ghana numbers formatted as {@code 2335XXXXXXXX} (12 digits) without plus are prefixed with {@code +}.</li>
 *   <li>Accidental duplicate country code inputs formatted as {@code 23305XXXXXXXX} or {@code +23305XXXXXXXX} (13 digits) are collapsed to {@code +2335XXXXXXXX}.</li>
 *   <li>Spaces, hyphens, parentheses, and presentation formatting characters are stripped out.</li>
 * </ul>
 */
public class PhoneNumberNormalizer {

    /**
     * Normalizes an input telephone number string into canonical format (+233XXXXXXXXX).
     *
     * @param phoneNumber the raw input phone number
     * @return the normalized phone number, or null if input is null/blank
     */
    public static String normalize(String phoneNumber) {
        if (phoneNumber == null || phoneNumber.isBlank()) {
            return null;
        }

        String trimmed = phoneNumber.trim();
        String digitsOnly = trimmed.replaceAll("[^0-9]", "");

        if (digitsOnly.isEmpty()) {
            return trimmed;
        }

        // Emergency short service codes (112, 192, 191, 193)
        if (digitsOnly.length() <= 5) {
            return digitsOnly;
        }

        // Accidental duplicate prefix: 2330XXXXXXXXX (13 digits starting with 2330) or +2330XXXXXXXXX
        if (digitsOnly.startsWith("2330") && digitsOnly.length() == 13) {
            return "+233" + digitsOnly.substring(4);
        }

        // Ghana numbers with country code without plus: 233XXXXXXXXX (12 digits)
        if (digitsOnly.startsWith("233") && digitsOnly.length() == 12) {
            return "+" + digitsOnly;
        }

        // Ghana local mobile / fixed numbers: 0XXXXXXXXX (10 digits starting with 0)
        if (digitsOnly.startsWith("0") && digitsOnly.length() == 10) {
            return "+233" + digitsOnly.substring(1);
        }

        // Ghana national significant number without trunk zero: 5XXXXXXXX or 2XXXXXXXX (9 digits)
        if (digitsOnly.length() == 9 && (digitsOnly.startsWith("2") || digitsOnly.startsWith("3") || digitsOnly.startsWith("5"))) {
            return "+233" + digitsOnly;
        }

        // International numbers already with plus
        if (trimmed.startsWith("+")) {
            return "+" + digitsOnly;
        }

        return "+" + digitsOnly;
    }
}
