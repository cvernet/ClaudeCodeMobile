package com.ccmobile.passwordmanager.data

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.ccmobile.passwordmanager.crypto.CryptoManager
import com.ccmobile.passwordmanager.crypto.EncryptedField

/**
 * Stores the non-secret-but-sensitive bootstrap material: the PBKDF2 salt, the master-password
 * verification token, and the auto-lock timeout. Backed by [EncryptedSharedPreferences] so the
 * file is itself encrypted at rest by a hardware-backed key.
 */
class SecurePrefs(context: Context) {

    private val prefs: SharedPreferences by lazy {
        val masterKey = MasterKey.Builder(context.applicationContext)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()
        EncryptedSharedPreferences.create(
            context.applicationContext,
            "vault_secure_prefs",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
        )
    }

    /** Whether a master password has already been configured. */
    val isInitialized: Boolean
        get() = prefs.contains(KEY_SALT) && prefs.contains(KEY_VERIFY_CIPHER)

    fun saveMasterCredentials(salt: ByteArray, verificationToken: EncryptedField) {
        prefs.edit()
            .putString(KEY_SALT, CryptoManager.encodeToString(salt))
            .putString(KEY_VERIFY_CIPHER, verificationToken.cipherText)
            .putString(KEY_VERIFY_IV, verificationToken.iv)
            .apply()
    }

    fun getSalt(): ByteArray? =
        prefs.getString(KEY_SALT, null)?.let { CryptoManager.decodeFromString(it) }

    fun getVerificationToken(): EncryptedField? {
        val cipher = prefs.getString(KEY_VERIFY_CIPHER, null) ?: return null
        val iv = prefs.getString(KEY_VERIFY_IV, null) ?: return null
        return EncryptedField(cipher, iv)
    }

    var autoLockMillis: Long
        get() = prefs.getLong(KEY_AUTO_LOCK, DEFAULT_AUTO_LOCK_MILLIS)
        set(value) = prefs.edit().putLong(KEY_AUTO_LOCK, value).apply()

    /** Wipes all bootstrap material (used when resetting the vault). */
    fun clear() {
        prefs.edit().clear().apply()
    }

    companion object {
        private const val KEY_SALT = "master_salt"
        private const val KEY_VERIFY_CIPHER = "verify_cipher"
        private const val KEY_VERIFY_IV = "verify_iv"
        private const val KEY_AUTO_LOCK = "auto_lock_millis"
        const val DEFAULT_AUTO_LOCK_MILLIS = 2 * 60 * 1000L // 2 minutes
    }
}
