package com.ccmobile.passwordmanager

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.navigation.compose.rememberNavController
import com.ccmobile.passwordmanager.ui.navigation.AppNavHost
import com.ccmobile.passwordmanager.ui.navigation.Routes
import com.ccmobile.passwordmanager.ui.theme.PasswordManagerTheme

class MainActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val container = (application as PasswordManagerApp).container

        setContent {
            PasswordManagerTheme {
                val navController = rememberNavController()
                val startDestination =
                    if (container.repository.isInitialized) Routes.UNLOCK else Routes.SETUP

                // Auto-lock: clear the in-memory key and return to the unlock screen whenever the
                // app goes to the background.
                val lifecycleOwner = LocalLifecycleOwner.current
                DisposableEffect(lifecycleOwner) {
                    val observer = LifecycleEventObserver { _, event ->
                        if (event == Lifecycle.Event.ON_STOP &&
                            container.repository.isInitialized &&
                            container.repository.isUnlocked
                        ) {
                            container.repository.lock()
                            navController.navigate(Routes.UNLOCK) {
                                popUpTo(navController.graph.id) { inclusive = true }
                            }
                        }
                    }
                    lifecycleOwner.lifecycle.addObserver(observer)
                    onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
                }

                AppNavHost(navController = navController, startDestination = startDestination)
            }
        }
    }
}
