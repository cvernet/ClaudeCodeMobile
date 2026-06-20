package com.ccmobile.passwordmanager.data

import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.PrimaryKey

@Entity(tableName = "categories")
data class CategoryEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val name: String,
)

/**
 * A stored credential. Sensitive fields are persisted as ciphertext + IV; the database never
 * holds the cleartext password or notes.
 */
@Entity(
    tableName = "credentials",
    foreignKeys = [
        ForeignKey(
            entity = CategoryEntity::class,
            parentColumns = ["id"],
            childColumns = ["categoryId"],
            onDelete = ForeignKey.SET_NULL,
        )
    ],
    indices = [Index("categoryId")],
)
data class CredentialEntity(
    @PrimaryKey(autoGenerate = true) val id: Long = 0,
    val title: String,
    val username: String,
    val passwordCipher: String,
    val passwordIv: String,
    val url: String,
    val notesCipher: String?,
    val notesIv: String?,
    val categoryId: Long?,
    val createdAt: Long,
    val updatedAt: Long,
)
