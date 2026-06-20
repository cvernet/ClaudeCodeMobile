package com.ccmobile.passwordmanager.data

/** Plaintext domain models exposed to the UI. The repository handles all encryption. */

data class Category(
    val id: Long,
    val name: String,
)

/**
 * Lightweight list entry. Holds no secrets, so the vault list can be shown without decrypting
 * every stored password.
 */
data class CredentialListItem(
    val id: Long,
    val title: String,
    val username: String,
    val url: String,
    val categoryId: Long?,
)

data class Credential(
    val id: Long,
    val title: String,
    val username: String,
    val password: String,
    val url: String,
    val notes: String,
    val categoryId: Long?,
    val createdAt: Long,
    val updatedAt: Long,
)
