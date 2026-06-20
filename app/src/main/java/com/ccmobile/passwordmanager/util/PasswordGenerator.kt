package com.ccmobile.passwordmanager.util

import java.security.SecureRandom

/** Options controlling [PasswordGenerator.generate]. */
data class PasswordOptions(
    val length: Int = 16,
    val useLowercase: Boolean = true,
    val useUppercase: Boolean = true,
    val useDigits: Boolean = true,
    val useSymbols: Boolean = true,
    val avoidAmbiguous: Boolean = false,
) {
    companion object {
        const val MIN_LENGTH = 4
        const val MAX_LENGTH = 64
    }
}

/**
 * Generates strong random passwords. Pure JDK (uses [SecureRandom]) so it is unit-testable
 * on a plain JVM.
 */
object PasswordGenerator {

    private const val LOWERCASE = "abcdefghijklmnopqrstuvwxyz"
    private const val UPPERCASE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    private const val DIGITS = "0123456789"
    private const val SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>?"

    // Characters that are easy to confuse visually.
    private const val AMBIGUOUS = "O0oIl1|S5B8Z2"

    private val secureRandom = SecureRandom()

    /**
     * @throws IllegalArgumentException if no character set is selected, or the length is out of range.
     */
    fun generate(options: PasswordOptions): String {
        val length = options.length
        require(length in PasswordOptions.MIN_LENGTH..PasswordOptions.MAX_LENGTH) {
            "Length must be between ${PasswordOptions.MIN_LENGTH} and ${PasswordOptions.MAX_LENGTH}"
        }

        val pools = buildList {
            if (options.useLowercase) add(filter(LOWERCASE, options.avoidAmbiguous))
            if (options.useUppercase) add(filter(UPPERCASE, options.avoidAmbiguous))
            if (options.useDigits) add(filter(DIGITS, options.avoidAmbiguous))
            if (options.useSymbols) add(filter(SYMBOLS, options.avoidAmbiguous))
        }.filter { it.isNotEmpty() }

        require(pools.isNotEmpty()) { "At least one character set must be selected" }

        val all = pools.joinToString("")
        val chars = ArrayList<Char>(length)

        // Guarantee at least one character from each selected pool (when length allows).
        for (pool in pools) {
            if (chars.size < length) chars.add(pool[secureRandom.nextInt(pool.length)])
        }
        // Fill the rest from the combined pool.
        while (chars.size < length) {
            chars.add(all[secureRandom.nextInt(all.length)])
        }
        // Shuffle so the guaranteed characters are not always at the front.
        for (i in chars.indices.reversed()) {
            val j = secureRandom.nextInt(i + 1)
            val tmp = chars[i]; chars[i] = chars[j]; chars[j] = tmp
        }
        return chars.joinToString("")
    }

    private fun filter(set: String, avoidAmbiguous: Boolean): String =
        if (avoidAmbiguous) set.filterNot { it in AMBIGUOUS } else set
}
