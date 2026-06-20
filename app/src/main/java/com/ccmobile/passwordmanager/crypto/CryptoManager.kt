package com.ccmobile.passwordmanager.crypto

import java.security.SecureRandom
import java.util.Base64
import javax.crypto.Cipher
import javax.crypto.SecretKey
import javax.crypto.SecretKeyFactory
import javax.crypto.spec.GCMParameterSpec
import javax.crypto.spec.PBEKeySpec
import javax.crypto.spec.SecretKeySpec

/**
 * One encrypted value: the ciphertext and the IV used to produce it, both Base64-encoded.
 * The IV is not secret and is stored alongside the ciphertext.
 */
data class EncryptedField(val cipherText: String, val iv: String)

/**
 * All cryptography for the vault. Deliberately depends only on the JDK (`java.*` / `javax.*`)
 * so it can be unit-tested on a plain JVM, with no Android framework involved.
 *
 * - Key derivation: PBKDF2WithHmacSHA256 from the master password + a random per-install salt.
 * - Field encryption: AES-256-GCM with a fresh random 12-byte IV for every value.
 */
object CryptoManager {

    private const val PBKDF2_ALGORITHM = "PBKDF2WithHmacSHA256"
    private const val PBKDF2_ITERATIONS = 120_000
    private const val KEY_LENGTH_BITS = 256

    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val IV_LENGTH_BYTES = 12
    const val SALT_LENGTH_BYTES = 16

    /** A known constant encrypted at setup time and re-checked on every unlock. */
    private const val VERIFICATION_PLAINTEXT = "vault-verification-v1"

    private val secureRandom = SecureRandom()
    private val encoder: Base64.Encoder = Base64.getEncoder()
    private val decoder: Base64.Decoder = Base64.getDecoder()

    fun generateSalt(): ByteArray = ByteArray(SALT_LENGTH_BYTES).also { secureRandom.nextBytes(it) }

    fun encodeToString(bytes: ByteArray): String = encoder.encodeToString(bytes)

    fun decodeFromString(value: String): ByteArray = decoder.decode(value)

    /**
     * Derives the AES key from the master password and salt. The resulting [SecretKey] is the
     * only thing held in memory while the vault is unlocked; the password itself is not retained.
     */
    fun deriveKey(masterPassword: CharArray, salt: ByteArray): SecretKey {
        val spec = PBEKeySpec(masterPassword, salt, PBKDF2_ITERATIONS, KEY_LENGTH_BITS)
        try {
            val factory = SecretKeyFactory.getInstance(PBKDF2_ALGORITHM)
            val keyBytes = factory.generateSecret(spec).encoded
            return SecretKeySpec(keyBytes, "AES")
        } finally {
            spec.clearPassword()
        }
    }

    fun encrypt(plainText: String, key: SecretKey): EncryptedField {
        val iv = ByteArray(IV_LENGTH_BYTES).also { secureRandom.nextBytes(it) }
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.ENCRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        val cipherBytes = cipher.doFinal(plainText.toByteArray(Charsets.UTF_8))
        return EncryptedField(
            cipherText = encoder.encodeToString(cipherBytes),
            iv = encoder.encodeToString(iv),
        )
    }

    /** @throws javax.crypto.AEADBadTagException if the key is wrong or the data was tampered with. */
    fun decrypt(field: EncryptedField, key: SecretKey): String {
        val iv = decoder.decode(field.iv)
        val cipherBytes = decoder.decode(field.cipherText)
        val cipher = Cipher.getInstance(TRANSFORMATION)
        cipher.init(Cipher.DECRYPT_MODE, key, GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))
        return String(cipher.doFinal(cipherBytes), Charsets.UTF_8)
    }

    /** Produces the verification token to persist at setup time. */
    fun createVerificationToken(key: SecretKey): EncryptedField =
        encrypt(VERIFICATION_PLAINTEXT, key)

    /** Returns true when [key] correctly decrypts [token] to the known constant. */
    fun verifyKey(token: EncryptedField, key: SecretKey): Boolean = try {
        decrypt(token, key) == VERIFICATION_PLAINTEXT
    } catch (e: Exception) {
        false
    }
}
