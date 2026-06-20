package com.ccmobile.passwordmanager.crypto

import javax.crypto.SecretKey

/**
 * Holds the derived AES key for the duration of an unlocked session, in memory only.
 * It is never written to disk and is cleared on [lock] (logout / app backgrounded / timeout).
 */
class SessionKeyHolder {

    @Volatile
    private var key: SecretKey? = null

    val isUnlocked: Boolean get() = key != null

    fun unlock(key: SecretKey) {
        this.key = key
    }

    fun lock() {
        key = null
    }

    /** @throws IllegalStateException if the vault is locked. */
    fun requireKey(): SecretKey =
        key ?: throw IllegalStateException("Vault is locked")
}
