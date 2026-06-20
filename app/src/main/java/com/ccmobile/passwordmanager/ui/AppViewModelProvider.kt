package com.ccmobile.passwordmanager.ui

import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.createSavedStateHandle
import androidx.lifecycle.viewmodel.CreationExtras
import androidx.lifecycle.viewmodel.initializer
import androidx.lifecycle.viewmodel.viewModelFactory
import com.ccmobile.passwordmanager.PasswordManagerApp
import com.ccmobile.passwordmanager.ui.detail.DetailViewModel
import com.ccmobile.passwordmanager.ui.edit.AddEditViewModel
import com.ccmobile.passwordmanager.ui.lock.LockViewModel
import com.ccmobile.passwordmanager.ui.vault.VaultViewModel

/** Returns the process-wide [PasswordManagerApp] from [CreationExtras]. */
private fun CreationExtras.app(): PasswordManagerApp =
    (this[ViewModelProvider.AndroidViewModelFactory.APPLICATION_KEY] as PasswordManagerApp)

/** Factories wiring each ViewModel to the shared [AppContainer]. */
object AppViewModelProvider {
    val Factory = viewModelFactory {
        initializer {
            LockViewModel(app().container.repository)
        }
        initializer {
            VaultViewModel(app().container.repository)
        }
        initializer {
            DetailViewModel(
                repository = app().container.repository,
                savedStateHandle = createSavedStateHandle(),
            )
        }
        initializer {
            AddEditViewModel(
                repository = app().container.repository,
                savedStateHandle = createSavedStateHandle(),
            )
        }
    }
}
