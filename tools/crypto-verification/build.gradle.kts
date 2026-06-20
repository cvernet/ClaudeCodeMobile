plugins {
    kotlin("jvm") version "2.0.21"
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

// Compile the real, Android-independent source files straight from the app module so this
// verification harness always tests exactly what ships. ClipboardUtil is excluded because it
// depends on the Android framework.
sourceSets {
    main {
        kotlin.setSrcDirs(
            listOf(
                "../../app/src/main/java/com/ccmobile/passwordmanager/crypto",
                "../../app/src/main/java/com/ccmobile/passwordmanager/util",
            )
        )
        kotlin.exclude("**/ClipboardUtil.kt")
    }
    test {
        kotlin.setSrcDirs(listOf("../../app/src/test/java"))
    }
}

tasks.test {
    testLogging {
        events("passed", "failed", "skipped")
    }
}
