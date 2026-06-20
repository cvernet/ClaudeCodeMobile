package com.ccmobile.passwordmanager.ui.lock

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccmobile.passwordmanager.data.VaultRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class LockUiState(
    val isLoading: Boolean = false,
    val error: String? = null,
)

/** Drives both the first-run setup screen and the unlock screen. */
class LockViewModel(private val repository: VaultRepository) : ViewModel() {

    private val _uiState = MutableStateFlow(LockUiState())
    val uiState: StateFlow<LockUiState> = _uiState.asStateFlow()

    val isInitialized: Boolean get() = repository.isInitialized

    /** First-run: validate the two entries match, then create the master password. */
    fun setup(password: String, confirm: String, onSuccess: () -> Unit) {
        when {
            password.length < MIN_LENGTH ->
                _uiState.value = LockUiState(error = "Le mot de passe doit faire au moins $MIN_LENGTH caractères")
            password != confirm ->
                _uiState.value = LockUiState(error = "Les mots de passe ne correspondent pas")
            else -> {
                _uiState.value = LockUiState(isLoading = true)
                viewModelScope.launch {
                    withContext(Dispatchers.Default) {
                        repository.setupMasterPassword(password.toCharArray())
                    }
                    _uiState.value = LockUiState()
                    onSuccess()
                }
            }
        }
    }

    fun unlock(password: String, onSuccess: () -> Unit) {
        if (password.isEmpty()) {
            _uiState.value = LockUiState(error = "Saisissez votre mot de passe maître")
            return
        }
        _uiState.value = LockUiState(isLoading = true)
        viewModelScope.launch {
            val ok = withContext(Dispatchers.Default) {
                repository.unlock(password.toCharArray())
            }
            if (ok) {
                _uiState.value = LockUiState()
                onSuccess()
            } else {
                _uiState.value = LockUiState(error = "Mot de passe incorrect")
            }
        }
    }

    fun clearError() {
        if (_uiState.value.error != null) _uiState.value = _uiState.value.copy(error = null)
    }

    companion object {
        const val MIN_LENGTH = 8
    }
}
