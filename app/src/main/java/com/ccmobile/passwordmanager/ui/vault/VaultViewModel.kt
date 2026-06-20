package com.ccmobile.passwordmanager.ui.vault

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccmobile.passwordmanager.data.Category
import com.ccmobile.passwordmanager.data.CredentialListItem
import com.ccmobile.passwordmanager.data.VaultRepository
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class VaultUiState(
    val credentials: List<CredentialListItem> = emptyList(),
    val categories: List<Category> = emptyList(),
    val query: String = "",
    val selectedCategoryId: Long? = null,
)

class VaultViewModel(private val repository: VaultRepository) : ViewModel() {

    private val query = MutableStateFlow("")
    private val selectedCategoryId = MutableStateFlow<Long?>(null)

    val uiState: StateFlow<VaultUiState> =
        combine(
            repository.observeCredentials(),
            repository.observeCategories(),
            query,
            selectedCategoryId,
        ) { credentials, categories, q, categoryId ->
            val filtered = credentials.filter { item ->
                val matchesCategory = categoryId == null || item.categoryId == categoryId
                val matchesQuery = q.isBlank() ||
                    item.title.contains(q, ignoreCase = true) ||
                    item.username.contains(q, ignoreCase = true) ||
                    item.url.contains(q, ignoreCase = true)
                matchesCategory && matchesQuery
            }
            VaultUiState(filtered, categories, q, categoryId)
        }.stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = VaultUiState(),
        )

    fun onQueryChange(value: String) {
        query.value = value
    }

    fun onCategorySelected(categoryId: Long?) {
        selectedCategoryId.value = categoryId
    }

    fun addCategory(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch { repository.addCategory(name) }
    }

    fun lock() = repository.lock()
}
