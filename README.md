# Coffre-fort — Gestionnaire de mots de passe (Android)

Application Android native (Kotlin + Jetpack Compose) pour stocker et gérer des mots de passe
**localement et de façon chiffrée**. Aucune donnée ne quitte l'appareil : pas de compte, pas de cloud.

## Fonctionnalités

- **Mot de passe maître** : déverrouille le coffre. La clé de chiffrement en est dérivée
  (PBKDF2-HMAC-SHA256, 120 000 itérations) et n'existe qu'en mémoire pendant la session.
- **Chiffrement local** : chaque mot de passe / note est chiffré en **AES-256-GCM** avec un IV
  aléatoire par enregistrement, avant d'être stocké dans la base Room. La base ne contient jamais
  de clair.
- **CRUD** des entrées : titre, identifiant, mot de passe, URL, notes, catégorie.
- **Générateur de mots de passe** : longueur réglable, majuscules / minuscules / chiffres /
  symboles, option « éviter les caractères ambigus ».
- **Recherche & catégories** : filtrage instantané et organisation par catégorie.
- **Copie dans le presse-papier** avec **effacement automatique** après 30 s (et marquage
  « sensible » sur Android 13+).
- **Verrouillage automatique** : la clé est effacée et le coffre reverrouillé dès que l'app passe
  en arrière-plan.

## Architecture

MVVM + Repository.

```
app/src/main/java/com/ccmobile/passwordmanager/
├── crypto/      CryptoManager (PBKDF2 + AES-GCM), SessionKeyHolder (clé en mémoire)
├── data/        Room (entités, DAO, AppDatabase), SecurePrefs, VaultRepository, modèles
├── util/        PasswordGenerator, ClipboardUtil
└── ui/          theme, navigation, lock (setup/unlock), vault, detail, edit, generator
```

- `CryptoManager` et `PasswordGenerator` ne dépendent **que du JDK** (`java.*` / `javax.*`) afin
  d'être testables sur une JVM standard.
- Le sel PBKDF2 et le jeton de vérification du mot de passe maître sont stockés dans des
  `EncryptedSharedPreferences` (Jetpack Security).

## Construire l'application

Prérequis : **Android SDK** (API 34) et **JDK 17+**. Le wrapper Gradle est fourni.

```bash
# définir l'emplacement du SDK
echo "sdk.dir=/chemin/vers/Android/sdk" > local.properties

./gradlew assembleDebug      # construit l'APK debug
./gradlew installDebug       # installe sur un appareil/émulateur connecté
```

> Le téléchargement des dépendances (AndroidX, Compose, Room) nécessite un accès au dépôt
> Google Maven (`dl.google.com` / `maven.google.com`).

## Tests

Les tests unitaires de la logique de sécurité (`app/src/test`) couvrent le chiffrement et le
générateur :

```bash
./gradlew test               # via le projet Android (nécessite le SDK)
```

Un harnais autonome **sans Android SDK** compile ces mêmes fichiers source et exécute les tests
sur une JVM pure :

```bash
gradle -p tools/crypto-verification test
```

## Sécurité — notes

- Le mot de passe maître **ne peut pas être récupéré** : l'oublier rend le coffre illisible (par
  conception).
- Les sauvegardes système sont désactivées (`allowBackup=false`, règles d'extraction de données).
- Évolutions possibles : déverrouillage biométrique (BiometricPrompt + clé Keystore), expiration
  par inactivité configurable, export/import chiffré.
