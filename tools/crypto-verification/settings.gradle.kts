// Standalone pure-JVM project used to unit-test the Android-independent core logic
// (CryptoManager, SessionKeyHolder, PasswordGenerator) without the Android SDK / toolchain.
pluginManagement {
    repositories {
        gradlePluginPortal()
        mavenCentral()
    }
}
dependencyResolutionManagement {
    repositories {
        mavenCentral()
    }
}
rootProject.name = "crypto-verification"
