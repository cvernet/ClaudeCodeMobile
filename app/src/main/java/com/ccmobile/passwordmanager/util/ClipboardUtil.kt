package com.ccmobile.passwordmanager.util

import android.content.ClipData
import android.content.ClipDescription
import android.content.ClipboardManager
import android.content.Context
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PersistableBundle

/**
 * Copies sensitive values to the clipboard and clears them automatically after a delay,
 * so a copied password does not linger indefinitely.
 */
object ClipboardUtil {

    private const val CLEAR_DELAY_MILLIS = 30_000L
    private val mainHandler = Handler(Looper.getMainLooper())

    fun copySensitive(context: Context, label: String, value: String) {
        val clipboard = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        val clip = ClipData.newPlainText(label, value)
        // Flag as sensitive so the system doesn't show the content in previews (Android 13+).
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            clip.description.extras = PersistableBundle().apply {
                putBoolean(ClipDescription.EXTRA_IS_SENSITIVE, true)
            }
        }
        clipboard.setPrimaryClip(clip)

        mainHandler.postDelayed({
            // Only clear if our value is still the current clip.
            val current = clipboard.primaryClip
            if (current != null && current.itemCount > 0 &&
                current.getItemAt(0).text?.toString() == value
            ) {
                clearClipboard(clipboard)
            }
        }, CLEAR_DELAY_MILLIS)
    }

    private fun clearClipboard(clipboard: ClipboardManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            clipboard.clearPrimaryClip()
        } else {
            clipboard.setPrimaryClip(ClipData.newPlainText("", ""))
        }
    }
}
