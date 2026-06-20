package com.ccmobile.passwordmanager.crypto

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class CryptoManagerTest {

    private fun key(password: String, salt: ByteArray) =
        CryptoManager.deriveKey(password.toCharArray(), salt)

    @Test
    fun `encrypt then decrypt returns original`() {
        val salt = CryptoManager.generateSalt()
        val k = key("correct horse battery staple", salt)

        val plaintext = "S3cr3t!Pässwörd—😀"
        val encrypted = CryptoManager.encrypt(plaintext, k)
        val decrypted = CryptoManager.decrypt(encrypted, k)

        assertEquals(plaintext, decrypted)
    }

    @Test
    fun `each encryption uses a fresh iv and ciphertext`() {
        val salt = CryptoManager.generateSalt()
        val k = key("master", salt)

        val a = CryptoManager.encrypt("same input", k)
        val b = CryptoManager.encrypt("same input", k)

        assertNotEquals(a.iv, b.iv)
        assertNotEquals(a.cipherText, b.cipherText)
        // Both still decrypt back to the same value.
        assertEquals("same input", CryptoManager.decrypt(a, k))
        assertEquals("same input", CryptoManager.decrypt(b, k))
    }

    @Test
    fun `wrong password cannot decrypt`() {
        val salt = CryptoManager.generateSalt()
        val good = key("good-password", salt)
        val bad = key("bad-password", salt)

        val encrypted = CryptoManager.encrypt("data", good)
        var failed = false
        try {
            CryptoManager.decrypt(encrypted, bad)
        } catch (e: Exception) {
            failed = true
        }
        assertTrue("Decryption with the wrong key must fail", failed)
    }

    @Test
    fun `same password and salt derive the same key`() {
        val salt = CryptoManager.generateSalt()
        val encrypted = CryptoManager.encrypt("hello", key("pw", salt))
        // A freshly derived key from the same password+salt decrypts it.
        assertEquals("hello", CryptoManager.decrypt(encrypted, key("pw", salt)))
    }

    @Test
    fun `verification token validates correct and rejects wrong password`() {
        val salt = CryptoManager.generateSalt()
        val k = key("the-master", salt)
        val token = CryptoManager.createVerificationToken(k)

        assertTrue(CryptoManager.verifyKey(token, key("the-master", salt)))
        assertFalse(CryptoManager.verifyKey(token, key("not-the-master", salt)))
    }

    @Test
    fun `base64 round trip`() {
        val salt = CryptoManager.generateSalt()
        val encoded = CryptoManager.encodeToString(salt)
        assertTrue(salt.contentEquals(CryptoManager.decodeFromString(encoded)))
        assertEquals(CryptoManager.SALT_LENGTH_BYTES, salt.size)
    }
}
