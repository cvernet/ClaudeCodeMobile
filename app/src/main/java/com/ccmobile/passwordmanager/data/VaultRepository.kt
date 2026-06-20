package com.ccmobile.passwordmanager.data

import com.ccmobile.passwordmanager.crypto.CryptoManager
import com.ccmobile.passwordmanager.crypto.EncryptedField
import com.ccmobile.passwordmanager.crypto.SessionKeyHolder
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map

/**
 * Single point of access to vault data. Translates between encrypted [CredentialEntity] rows and
 * plaintext domain [Credential]s, and owns the master-password lifecycle (setup / unlock / lock).
 */
class VaultRepository(
    private val credentialDao: CredentialDao,
    private val categoryDao: CategoryDao,
    private val securePrefs: SecurePrefs,
    private val session: SessionKeyHolder,
) {

    // ---- Master password / session ----

    val isInitialized: Boolean get() = securePrefs.isInitialized
    val isUnlocked: Boolean get() = session.isUnlocked

    /** First-run setup: derive the key from [password], persist salt + verification token, unlock. */
    fun setupMasterPassword(password: CharArray) {
        val salt = CryptoManager.generateSalt()
        val key = CryptoManager.deriveKey(password, salt)
        val token = CryptoManager.createVerificationToken(key)
        securePrefs.saveMasterCredentials(salt, token)
        session.unlock(key)
    }

    /** Returns true and unlocks the session if [password] is correct; false otherwise. */
    fun unlock(password: CharArray): Boolean {
        val salt = securePrefs.getSalt() ?: return false
        val token = securePrefs.getVerificationToken() ?: return false
        val key = CryptoManager.deriveKey(password, salt)
        return if (CryptoManager.verifyKey(token, key)) {
            session.unlock(key)
            true
        } else {
            false
        }
    }

    fun lock() = session.lock()

    // ---- Credentials ----

    fun observeCredentials(): Flow<List<CredentialListItem>> =
        credentialDao.observeAll().map { list ->
            list.map { CredentialListItem(it.id, it.title, it.username, it.url, it.categoryId) }
        }

    suspend fun getCredential(id: Long): Credential? {
        val entity = credentialDao.getById(id) ?: return null
        val key = session.requireKey()
        val password = CryptoManager.decrypt(
            EncryptedField(entity.passwordCipher, entity.passwordIv), key,
        )
        val notes = if (entity.notesCipher != null && entity.notesIv != null) {
            CryptoManager.decrypt(EncryptedField(entity.notesCipher, entity.notesIv), key)
        } else {
            ""
        }
        return Credential(
            id = entity.id,
            title = entity.title,
            username = entity.username,
            password = password,
            url = entity.url,
            notes = notes,
            categoryId = entity.categoryId,
            createdAt = entity.createdAt,
            updatedAt = entity.updatedAt,
        )
    }

    /** Inserts (id == 0) or updates a credential, encrypting the secret fields. Returns the row id. */
    suspend fun saveCredential(
        id: Long,
        title: String,
        username: String,
        password: String,
        url: String,
        notes: String,
        categoryId: Long?,
    ): Long {
        val key = session.requireKey()
        val now = System.currentTimeMillis()
        val passwordField = CryptoManager.encrypt(password, key)
        val notesField = if (notes.isNotEmpty()) CryptoManager.encrypt(notes, key) else null

        val existing = if (id != 0L) credentialDao.getById(id) else null
        val entity = CredentialEntity(
            id = id,
            title = title,
            username = username,
            passwordCipher = passwordField.cipherText,
            passwordIv = passwordField.iv,
            url = url,
            notesCipher = notesField?.cipherText,
            notesIv = notesField?.iv,
            categoryId = categoryId,
            createdAt = existing?.createdAt ?: now,
            updatedAt = now,
        )
        return if (existing == null) {
            credentialDao.insert(entity)
        } else {
            credentialDao.update(entity)
            id
        }
    }

    suspend fun deleteCredential(id: Long) = credentialDao.deleteById(id)

    // ---- Categories ----

    fun observeCategories(): Flow<List<Category>> =
        categoryDao.observeAll().map { list -> list.map { Category(it.id, it.name) } }

    suspend fun addCategory(name: String): Long =
        categoryDao.insert(CategoryEntity(name = name.trim()))

    suspend fun deleteCategory(category: Category) =
        categoryDao.delete(CategoryEntity(category.id, category.name))
}
