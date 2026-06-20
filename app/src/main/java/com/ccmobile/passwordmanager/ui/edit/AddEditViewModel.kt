package com.ccmobile.passwordmanager.ui.edit

import androidx.lifecycle.SavedStateHandle
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.ccmobile.passwordmanager.data.Category
import com.ccmobile.passwordmanager.data.VaultRepository
import com.ccmobile.passwordmanager.ui.navigation.Routes
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch

data class AddEditForm(
    val title: String = "",
    val username: String = "",
    val password: String = "",
    val url: String = "",
    val notes: String = "",
    val categoryId: Long? = null,
    val isLoading: Boolean = true,
)

class AddEditViewModel(
    private val repository: VaultRepository,
    savedStateHandle: SavedStateHandle,
) : ViewModel() {

    private val id: Long = savedStateHandle.get<Long>(Routes.ARG_ID) ?: Routes.NEW_ID
    val isEditing: Boolean get() = id != Routes.NEW_ID

    private val _form = MutableStateFlow(AddEditForm())
    val form: StateFlow<AddEditForm> = _form

    val categories: StateFlow<List<Category>> =
        repository.observeCategories().stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5_000),
            initialValue = emptyList(),
        )

    init {
        if (isEditing) {
            viewModelScope.launch {
                val credential = repository.getCredential(id)
                _form.value = if (credential != null) {
                    AddEditForm(
                        title = credential.title,
                        username = credential.username,
                        password = credential.password,
                        url = credential.url,
                        notes = credential.notes,
                        categoryId = credential.categoryId,
                        isLoading = false,
                    )
                } else {
                    AddEditForm(isLoading = false)
                }
            }
        } else {
            _form.value = AddEditForm(isLoading = false)
        }
    }

    fun onTitleChange(value: String) { _form.value = _form.value.copy(title = value) }
    fun onUsernameChange(value: String) { _form.value = _form.value.copy(username = value) }
    fun onPasswordChange(value: String) { _form.value = _form.value.copy(password = value) }
    fun onUrlChange(value: String) { _form.value = _form.value.copy(url = value) }
    fun onNotesChange(value: String) { _form.value = _form.value.copy(notes = value) }
    fun onCategoryChange(value: Long?) { _form.value = _form.value.copy(categoryId = value) }

    fun addCategory(name: String) {
        if (name.isBlank()) return
        viewModelScope.launch {
            val newId = repository.addCategory(name)
            if (newId > 0) _form.value = _form.value.copy(categoryId = newId)
        }
    }

    fun save(onSaved: () -> Unit) {
        val f = _form.value
        if (f.title.isBlank() || f.password.isEmpty()) return
        viewModelScope.launch {
            repository.saveCredential(
                id = if (isEditing) id else 0L,
                title = f.title.trim(),
                username = f.username.trim(),
                password = f.password,
                url = f.url.trim(),
                notes = f.notes,
                categoryId = f.categoryId,
            )
            onSaved()
        }
    }
}
