package com.gec.backend.admin.security;

import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.util.Locale;

/**
 * Standards-based RFC 6238 TOTP (Time-Based One-Time Password) engine.
 * Compatible with standard authenticator applications (Google Authenticator, Microsoft Authenticator, Authy, 1Password).
 *
 * <p>Specifications:
 * <ul>
 *   <li>Time Step: 30 seconds</li>
 *   <li>OTP Length: 6 numeric digits</li>
 *   <li>Algorithm: HMAC-SHA1</li>
 *   <li>Clock Skew Window: 1 step behind (-30s), current step (0s), 1 step ahead (+30s)</li>
 * </ul>
 */
@Service
public class TotpService {

    private static final String ISSUER = "Ghana Emergency Connect";
    private static final int SECRET_SIZE_BYTES = 20; // 160 bits
    private static final int TIME_STEP_SECONDS = 30;
    private static final int OTP_DIGITS = 6;
    private static final String BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a cryptographically secure random Base32 shared secret string.
     *
     * @return 32-character Base32 encoded string
     */
    public String generateBase32Secret() {
        byte[] bytes = new byte[SECRET_SIZE_BYTES];
        secureRandom.nextBytes(bytes);
        return encodeBase32(bytes);
    }

    /**
     * Constructs a standard {@code otpauth://totp} provisioning URI for QR code scanning.
     *
     * @param accountLabel user account identifier (e.g. email or phone)
     * @param secret       plaintext Base32 TOTP secret
     * @return standard RFC 6238 provisioning URI
     */
    public String generateProvisioningUri(String accountLabel, String secret) {
        try {
            String encodedIssuer = URLEncoder.encode(ISSUER, StandardCharsets.UTF_8).replace("+", "%20");
            String encodedLabel = URLEncoder.encode(accountLabel, StandardCharsets.UTF_8).replace("+", "%20");

            return String.format(
                Locale.US,
                "otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=%d&period=%d",
                encodedIssuer,
                encodedLabel,
                secret.trim().toUpperCase(Locale.US),
                encodedIssuer,
                OTP_DIGITS,
                TIME_STEP_SECONDS
            );
        } catch (Exception e) {
            throw new RuntimeException("Failed to encode TOTP provisioning URI", e);
        }
    }

    /**
     * Verifies a 6-digit TOTP code against a Base32 shared secret with clock skew tolerance (-30s, 0s, +30s).
     *
     * @param secret       plaintext Base32 TOTP secret
     * @param code         user-submitted 6-digit TOTP string
     * @return true if the code is valid within the allowed time window
     */
    public boolean verifyCode(String secret, String code) {
        if (secret == null || secret.isBlank() || code == null || code.isBlank()) {
            return false;
        }

        String sanitizedCode = code.replaceAll("[^0-9]", "");
        if (sanitizedCode.length() != OTP_DIGITS) {
            return false;
        }

        try {
            long currentStep = System.currentTimeMillis() / 1000L / TIME_STEP_SECONDS;
            byte[] keyBytes = decodeBase32(secret.trim().toUpperCase(Locale.US));

            for (int offset = -1; offset <= 1; offset++) {
                long step = currentStep + offset;
                String expectedCode = calculateCode(keyBytes, step);
                if (expectedCode.equals(sanitizedCode)) {
                    return true;
                }
            }
            return false;
        } catch (Exception e) {
            return false;
        }
    }

    private String calculateCode(byte[] keyBytes, long timeStep) throws Exception {
        byte[] data = ByteBuffer.allocate(8).putLong(timeStep).array();

        SecretKeySpec signKey = new SecretKeySpec(keyBytes, "HmacSHA1");
        Mac mac = Mac.getInstance("HmacSHA1");
        mac.init(signKey);

        byte[] hash = mac.doFinal(data);
        int offset = hash[hash.length - 1] & 0x0F;

        long truncatedHash = 0;
        for (int i = 0; i < 4; ++i) {
            truncatedHash <<= 8;
            truncatedHash |= (hash[offset + i] & 0xFF);
        }
        truncatedHash &= 0x7FFFFFFF;

        long otp = truncatedHash % 1000000L;
        return String.format(Locale.US, "%06d", otp);
    }

    private String encodeBase32(byte[] data) {
        StringBuilder sb = new StringBuilder();
        int buffer = 0;
        int bitsLeft = 0;

        for (byte b : data) {
            buffer = (buffer << 8) | (b & 0xFF);
            bitsLeft += 8;
            while (bitsLeft >= 5) {
                int index = (buffer >> (bitsLeft - 5)) & 0x1F;
                sb.append(BASE32_ALPHABET.charAt(index));
                bitsLeft -= 5;
            }
        }

        if (bitsLeft > 0) {
            int index = (buffer << (5 - bitsLeft)) & 0x1F;
            sb.append(BASE32_ALPHABET.charAt(index));
        }

        return sb.toString();
    }

    private byte[] decodeBase32(String base32) {
        String clean = base32.toUpperCase(Locale.US).replaceAll("[=]", "");
        byte[] bytes = new byte[clean.length() * 5 / 8];
        int buffer = 0;
        int bitsLeft = 0;
        int count = 0;

        for (int i = 0; i < clean.length(); i++) {
            char ch = clean.charAt(i);
            int value = BASE32_ALPHABET.indexOf(ch);
            if (value < 0) {
                throw new IllegalArgumentException("Illegal Base32 character: " + ch);
            }
            buffer = (buffer << 5) | value;
            bitsLeft += 5;
            if (bitsLeft >= 8) {
                bytes[count++] = (byte) ((buffer >> (bitsLeft - 8)) & 0xFF);
                bitsLeft -= 8;
            }
        }
        return bytes;
    }
}
