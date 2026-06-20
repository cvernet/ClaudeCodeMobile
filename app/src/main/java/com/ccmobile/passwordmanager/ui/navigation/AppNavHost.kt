package com.ccmobile.passwordmanager.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.navArgument
import com.ccmobile.passwordmanager.ui.detail.CredentialDetailScreen
import com.ccmobile.passwordmanager.ui.edit.AddEditCredentialScreen
import com.ccmobile.passwordmanager.ui.lock.SetupMasterPasswordScreen
import com.ccmobile.passwordmanager.ui.lock.UnlockScreen
import com.ccmobile.passwordmanager.ui.vault.VaultListScreen

object Routes {
    const val SETUP = "setup"
    const val UNLOCK = "unlock"
    const val VAULT = "vault"
    const val DETAIL = "detail"
    const val EDIT = "edit"
    const val ARG_ID = "id"

    fun detail(id: Long) = "$DETAIL/$id"
    fun edit(id: Long = NEW_ID) = "$EDIT/$id"

    /** Sentinel id meaning "create new" (Room auto-generated ids start at 1). */
    const val NEW_ID = 0L
}

@Composable
fun AppNavHost(
    navController: NavHostController,
    startDestination: String,
) {
    NavHost(navController = navController, startDestination = startDestination) {

        composable(Routes.SETUP) {
            SetupMasterPasswordScreen(
                onSetupComplete = {
                    navController.navigate(Routes.VAULT) {
                        popUpTo(Routes.SETUP) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.UNLOCK) {
            UnlockScreen(
                onUnlocked = {
                    navController.navigate(Routes.VAULT) {
                        popUpTo(Routes.UNLOCK) { inclusive = true }
                    }
                },
            )
        }

        composable(Routes.VAULT) {
            VaultListScreen(
                onAddClick = { navController.navigate(Routes.edit()) },
                onCredentialClick = { id -> navController.navigate(Routes.detail(id)) },
                onLock = {
                    navController.navigate(Routes.UNLOCK) {
                        popUpTo(navController.graph.id) { inclusive = true }
                    }
                },
            )
        }

        composable(
            route = "${Routes.DETAIL}/{${Routes.ARG_ID}}",
            arguments = listOf(navArgument(Routes.ARG_ID) { type = NavType.LongType }),
        ) {
            CredentialDetailScreen(
                onBack = { navController.popBackStack() },
                onEdit = { id ->
                    navController.navigate(Routes.edit(id))
                },
                onDeleted = { navController.popBackStack(Routes.VAULT, inclusive = false) },
            )
        }

        composable(
            route = "${Routes.EDIT}/{${Routes.ARG_ID}}",
            arguments = listOf(navArgument(Routes.ARG_ID) {
                type = NavType.LongType
                defaultValue = Routes.NEW_ID
            }),
        ) {
            AddEditCredentialScreen(
                onBack = { navController.popBackStack() },
                onSaved = { navController.popBackStack() },
            )
        }
    }
}
