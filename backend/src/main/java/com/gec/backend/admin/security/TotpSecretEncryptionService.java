package com.gec.backend.admin.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.Cipher;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

/**
 * Reversibly encrypts Base32 TOTP shared secrets at rest using AES-GCM 256-bit authenticated encryption.
 *
 * <p>Security Rationale:
 * Unlike passwords which are stored using one-way cryptographic hashes (e.g. BCrypt/PBKDF2),
 * RFC 6238 TOTP verification requires the server to access the original shared secret in order to
 * calculate expected HMAC-SHA1 time-step hashes during authentication. Therefore, secrets must be
 * encrypted at rest using an authenticated symmetric cipher (AES-GCM) with a unique random IV per operation.
 */
@Component
public class TotpSecretEncryptionService {

    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private static final int GCM_IV_LENGTH_BYTES = 12;
    private static final int GCM_TAG_LENGTH_BITS = 128;

    private final SecretKey secretKey;
    private final SecureRandom secureRandom = new SecureRandom();

    public TotpSecretEncryptionService(
        @Value("${gec.totp.encryption-key:GecDefaultTotpEncryptionKeyMaster32Bytes!}") String masterKeyString
    ) {
        try {
            MessageDigest sha = MessageDigest.getInstance("SHA-256");
            byte[] keyBytes = sha.digest(masterKeyString.getBytes(StandardCharsets.UTF_8));
            this.secretKey = new SecretKeySpec(keyBytes, "AES");
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize TOTP encryption key", e);
        }
    }

    /**
     * Encrypts a plaintext Base32 TOTP secret using AES-GCM.
     *
     * @param plaintextSecret the raw Base32 TOTP shared secret
     * @return Base64 encoded string combining IV + ciphertext
     */
    public String encrypt(String plaintextSecret) {
        if (plaintextSecret == null || plaintextSecret.isBlank()) {
            return null;
        }

        try {
            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            secureRandom.nextBytes(iv);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.ENCRYPT_MODE, secretKey, parameterSpec);

            byte[] cipherText = cipher.doFinal(plaintextSecret.getBytes(StandardCharsets.UTF_8));

            byte[] combined = new byte[iv.length + cipherText.length];
            System.arraycopy(iv, 0, combined, 0, iv.length);
            System.arraycopy(cipherText, 0, combined, iv.length, cipherText.length);

            return Base64.getEncoder().encodeToString(combined);
        } catch (Exception e) {
            throw new RuntimeException("Failed to encrypt TOTP secret", e);
        }
    }

    /**
     * Decrypts an AES-GCM encrypted Base64 string back into the plaintext Base32 TOTP secret.
     *
     * @param encryptedSecret Base64 string combining IV + ciphertext
     * @return the raw Base32 TOTP shared secret
     */
    public String decrypt(String encryptedSecret) {
        if (encryptedSecret == null || encryptedSecret.isBlank()) {
            return null;
        }

        try {
            byte[] combined = Base64.getDecoder().decode(encryptedSecret);
            if (combined.length <= GCM_IV_LENGTH_BYTES) {
                throw new IllegalArgumentException("Invalid encrypted payload length.");
            }

            byte[] iv = new byte[GCM_IV_LENGTH_BYTES];
            System.arraycopy(combined, 0, iv, 0, iv.length);

            byte[] cipherText = new byte[combined.length - iv.length];
            System.arraycopy(combined, iv.length, cipherText, 0, cipherText.length);

            Cipher cipher = Cipher.getInstance(ALGORITHM);
            GCMParameterSpec parameterSpec = new GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv);
            cipher.init(Cipher.DECRYPT_MODE, secretKey, parameterSpec);

            byte[] plaintextBytes = cipher.doFinal(cipherText);
            return new String(plaintextBytes, StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("Failed to decrypt TOTP secret", e);
        }
    }
}
