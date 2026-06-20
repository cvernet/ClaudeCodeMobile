package com.ccmobile.passwordmanager.ui.detail

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccmobile.passwordmanager.data.Credential
import com.ccmobile.passwordmanager.data.VaultRepository
import com.ccmobile.passwordmanager.ui.navigation.Routes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch

data class DetailUiState(
    val isLoading: Boolean = true,
    val credential: Credential? = null,
)

class DetailViewModel(
    private val repository: VaultRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val id: Long = savedStateHandle.get<Long>(Routes.ARG_ID) ?: Routes.NEW_ID

    private val _uiState = MutableStateFlow(DetailUiState())
    val uiState: StateFlow<DetailUiState> = _uiState.asStateFlow()

    init {
        load()
    }

    private fun load() {
        viewModelScope.launch {
            val credential = if (id != Routes.NEW_ID) repository.getCredential(id) else null
            _uiState.value = DetailUiState(isLoading = false, credential = credential)
        }
    }

    fun delete(onDeleted: () -> Unit) {
        viewModelScope.launch {
            repository.deleteCredential(id)
            onDeleted()
        }
    }
}
