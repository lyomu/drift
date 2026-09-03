import java.util.Properties

plugins {
    id("com.android.application")
    id("kotlin-android")
    // The Flutter Gradle Plugin must be applied after the Android and Kotlin Gradle plugins.
    id("dev.flutter.flutter-gradle-plugin")
    // Firebase (Phase 6, push notifications). The FlutterFire packages pull in
    // the firebase-messaging AAR themselves, so no manual dependency block is
    // needed here — this plugin only processes app/google-services.json.
    id("com.google.gms.google-services")
}

// Which credentials file to sign with. `-Pdrift.signing=release` resolves to
// `key.release.properties`; passing nothing resolves to `key.properties`, so
// debug and preview builds behave exactly as they did before. The environment
// variable names a file outright and wins over the profile, for a CI runner
// that mounts its own. Before this existed the filename was hardcoded, which
// meant the rotated release key could only be reached by setting all four
// DRIFT_ANDROID_* variables — and a plain `--release` build silently used
// preview instead.
val signingProfile = (project.findProperty("drift.signing") as String?)?.takeIf { it.isNotBlank() }
val releaseSigningFileName =
    System.getenv("DRIFT_ANDROID_KEY_PROPERTIES")?.takeIf { it.isNotBlank() }
        ?: if (signingProfile == null || signingProfile == "default") {
            "key.properties"
        } else {
            "key.$signingProfile.properties"
        }

val releaseSigningProperties = Properties()
val releaseSigningPropertiesFile = rootProject.file(releaseSigningFileName)
if (releaseSigningPropertiesFile.exists()) {
    releaseSigningPropertiesFile.inputStream().use(releaseSigningProperties::load)
}

fun releaseSigningValue(propertyName: String, environmentName: String): String? =
    releaseSigningProperties.getProperty(propertyName)?.takeIf { it.isNotBlank() }
        ?: System.getenv(environmentName)?.takeIf { it.isNotBlank() }

val releaseKeyAlias = releaseSigningValue("keyAlias", "DRIFT_ANDROID_KEY_ALIAS")
val releaseKeyPassword = releaseSigningValue("keyPassword", "DRIFT_ANDROID_KEY_PASSWORD")
val releaseStoreFile = releaseSigningValue("storeFile", "DRIFT_ANDROID_KEYSTORE_PATH")
val releaseStorePassword = releaseSigningValue("storePassword", "DRIFT_ANDROID_STORE_PASSWORD")
val hasReleaseSigning = listOf(
    releaseKeyAlias,
    releaseKeyPassword,
    releaseStoreFile,
    releaseStorePassword,
).all { !it.isNullOrBlank() }
val releaseTaskRequested = gradle.startParameter.taskNames.any {
    it.contains("release", ignoreCase = true)
}

if (releaseTaskRequested && !hasReleaseSigning) {
    throw GradleException(
        "Release signing is not configured. Copy key.properties.example to " +
            "$releaseSigningFileName or set the DRIFT_ANDROID_* environment variables.",
    )
}

// Google Play binds an app to its signing key on the first upload and that
// binding can never be changed. `key.properties` still points at the preview
// key deliberately — preview builds keep their own identity — so the failure
// this guards against is quiet and permanent: run `--release` without choosing
// a profile and the store would take preview as the app's real key forever.
// Naming the keystore and alias out loud is the other half; a signing config
// nobody can see is one nobody checks. Passwords are never printed, which is
// the same care tracker 5.1 took when the key was rotated.
if (releaseTaskRequested && hasReleaseSigning) {
    logger.lifecycle(
        "Drift release signing: $releaseSigningFileName -> $releaseStoreFile (alias $releaseKeyAlias)",
    )
    if (releaseKeyAlias == "preview" && !project.hasProperty("drift.allowPreviewSigning")) {
        throw GradleException(
            "Refusing to sign a release build with the preview key (alias 'preview', " +
                "from $releaseSigningFileName). Play binds an app to its signing key on " +
                "first upload and it can never be changed afterwards. Use " +
                "-Pdrift.signing=release for a store build, or pass " +
                "-Pdrift.allowPreviewSigning if a preview-signed release artifact is " +
                "genuinely what you want.",
        )
    }
}

android {
    namespace = "com.drift.tennis.drift_tennis"
    compileSdk = flutter.compileSdkVersion
    ndkVersion = flutter.ndkVersion

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_11
        targetCompatibility = JavaVersion.VERSION_11
    }

    kotlinOptions {
        jvmTarget = JavaVersion.VERSION_11.toString()
    }

    defaultConfig {
        // TODO: Specify your own unique Application ID (https://developer.android.com/studio/build/application-id.html).
        applicationId = "com.drift.tennis.drift_tennis"
        // You can update the following values to match your application needs.
        // For more information, see: https://flutter.dev/to/review-gradle-config.
        minSdk = flutter.minSdkVersion
        targetSdk = flutter.targetSdkVersion
        versionCode = flutter.versionCode
        versionName = flutter.versionName
    }

    if (hasReleaseSigning) {
        signingConfigs {
            create("release") {
                keyAlias = releaseKeyAlias
                keyPassword = releaseKeyPassword
                storeFile = rootProject.file(releaseStoreFile!!)
                storePassword = releaseStorePassword
                enableV1Signing = true
                enableV2Signing = true
            }
        }
    }

    buildTypes {
        release {
            if (hasReleaseSigning) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }
}

flutter {
    source = "../.."
}
