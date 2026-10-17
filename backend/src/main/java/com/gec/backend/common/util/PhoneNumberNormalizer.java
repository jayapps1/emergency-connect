package com.gec.backend.common.util;

/**
 * Utility service for normalizing Ghana telephone numbers into a canonical international E.164-style format.
 *
 * <p>Normalization Rules:
 * <ul>
 *   <li>Short emergency service codes (e.g. 112, 192, 191, 193) are preserved as raw digits without modifications.</li>
 *   <li>Ghana national numbers formatted as {@code 0XXXXXXXXX} (10 digits) are converted to {@code +233XXXXXXXXX}.</li>
 *   <li>Numbers formatted as {@code 233XXXXXXXXX} (12 digits) without a leading plus are prefixed with {@code +}.</li>
 *   <li>Spaces, hyphens, parentheses, and presentation formatting characters are stripped out.</li>
 * </ul>
 *
 * <p>The normalized phone number is stored in {@code station_contact.normalized_phone_number} to enforce global
 * database uniqueness constraints and prevent duplicate number registration across stations.
 */
public class PhoneNumberNormalizer {

    /**
     * Normalizes a input telephone number string into canonical format (+233XXXXXXXXX).
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

        // Ghana local mobile / fixed numbers: 0XXXXXXXXX (10 digits)
        if (digitsOnly.length() == 10 && digitsOnly.startsWith("0")) {
            return "+233" + digitsOnly.substring(1);
        }

        // Ghana numbers with country code without plus: 233XXXXXXXXX (12 digits)
        if (digitsOnly.length() == 12 && digitsOnly.startsWith("233")) {
            return "+" + digitsOnly;
        }

        // International numbers already with plus
        if (trimmed.startsWith("+")) {
            return "+" + digitsOnly;
        }

        return "+" + digitsOnly;
    }
}
