package com.ccmobile.passwordmanager

import android.app.Application
import com.ccmobile.passwordmanager.crypto.SessionKeyHolder
import com.ccmobile.passwordmanager.data.AppDatabase
import com.ccmobile.passwordmanager.data.SecurePrefs
import com.ccmobile.passwordmanager.data.VaultRepository

/** Minimal manual DI container, created once for the process. */
class AppContainer(app: Application) {
    private val database = AppDatabase.get(app)
    val securePrefs = SecurePrefs(app)
    val session = SessionKeyHolder()
    val repository = VaultRepository(
        credentialDao = database.credentialDao(),
        categoryDao = database.categoryDao(),
        securePrefs = securePrefs,
        session = session,
    )
}

class PasswordManagerApp : Application() {
    lateinit var container: AppContainer
        private set

    override fun onCreate() {
        super.onCreate()
        container = AppContainer(this)
    }
}
