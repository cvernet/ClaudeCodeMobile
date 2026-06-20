package com.ccmobile.passwordmanager.util

import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Assert.fail
import org.junit.Test

class PasswordGeneratorTest {

    @Test
    fun `respects requested length`() {
        for (len in intArrayOf(4, 12, 16, 32, 64)) {
            val pw = PasswordGenerator.generate(PasswordOptions(length = len))
            assertEquals(len, pw.length)
        }
    }

    @Test
    fun `only digits when only digits selected`() {
        val pw = PasswordGenerator.generate(
            PasswordOptions(
                length = 40,
                useLowercase = false,
                useUppercase = false,
                useDigits = true,
                useSymbols = false,
            ),
        )
        assertTrue(pw.all { it.isDigit() })
    }

    @Test
    fun `includes at least one of each selected set`() {
        val pw = PasswordGenerator.generate(
            PasswordOptions(
                length = 20,
                useLowercase = true,
                useUppercase = true,
                useDigits = true,
                useSymbols = true,
            ),
        )
        assertTrue("has lowercase", pw.any { it in 'a'..'z' })
        assertTrue("has uppercase", pw.any { it in 'A'..'Z' })
        assertTrue("has digit", pw.any { it.isDigit() })
        assertTrue("has symbol", pw.any { !it.isLetterOrDigit() })
    }

    @Test
    fun `avoid ambiguous removes confusing characters`() {
        val ambiguous = "O0oIl1|S5B8Z2".toSet()
        repeat(20) {
            val pw = PasswordGenerator.generate(
                PasswordOptions(length = 64, avoidAmbiguous = true),
            )
            assertTrue(pw.none { it in ambiguous })
        }
    }

    @Test
    fun `no character set selected throws`() {
        try {
            PasswordGenerator.generate(
                PasswordOptions(
                    useLowercase = false,
                    useUppercase = false,
                    useDigits = false,
                    useSymbols = false,
                ),
            )
            fail("Expected IllegalArgumentException")
        } catch (e: IllegalArgumentException) {
            // expected
        }
    }

    @Test
    fun `length out of range throws`() {
        try {
            PasswordGenerator.generate(PasswordOptions(length = 2))
            fail("Expected IllegalArgumentException")
        } catch (e: IllegalArgumentException) {
            // expected
        }
    }
}
