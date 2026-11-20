# NoteFrais : documentation technique

## 1. Objet

NoteFrais permet aux salariés de déclarer leurs notes de frais, aux managers de les valider et aux
administrateurs de produire les exports comptables. L'application est un monolithe web Java
(rendu côté serveur) adossé à une base PostgreSQL, packagé en WAR et déployé sur un Tomcat externe.

### Pile technique

| Couche | Composant | Version |
|---|---|---|
| Langage / JVM | Java (Eclipse Temurin) | 17 |
| Serveur d'applications | Apache Tomcat (WAR `ROOT.war`) | 9.0.60 |
| Framework | Spring Boot / Spring Framework | 2.6.5 / 5.3.17 |
| Vues | Thymeleaf + thymeleaf-spring5 | 3.0.11 |
| Sérialisation JSON | Jackson databind | 2.10.0 |
| Journalisation | Log4j 2 (via SLF4J) | 2.14.1 |
| Accès aux données | Spring JDBC (JdbcTemplate), driver PostgreSQL | 42.3.1 |
| Base de données | PostgreSQL | 11.15 |
| Utilitaires | Apache commons-text / commons-collections | 1.9 / 3.2.1 |

## 2. Schéma d'architecture

```mermaid
flowchart LR
    subgraph Client
        B[Navigateur web]
        M[App mobile / outil comptable]
    end

    subgraph APP["Application NoteFrais (WAR Spring Boot 2.6 sur Tomcat 9.0.60 :8080)"]
        direction TB
        I[AuthInterceptor<br/>contrôle d'accès]
        subgraph C[Contrôleurs]
            LC[LoginController]
            DC[DashboardController]
            EC[ExpenseController]
            PC[ProfileController]
            AC[AdminController]
            HC[HelpController]
            API[ApiController<br/>REST JSON]
        end
        subgraph S[Services]
            ES[ExpenseService<br/>calculs & plafonds]
            XR[ExchangeRateService]
            FS[FileStorageService]
            NS[NotificationService]
            RS[ReportService]
            IS[ImportService XML]
        end
        subgraph R[Repositories JdbcTemplate]
            UR[UserRepository]
            ER[ExpenseRepository]
            AR[AuditRepository]
        end
        T[Templates Thymeleaf]
        ACT[Spring Actuator<br/>/actuator/*]
    end

    DB[(PostgreSQL 11<br/>users / expenses / audit_log)]
    LEG[(Base de l'ancien outil)]
    LOG[[Log4j 2<br/>console / fichiers]]
    FSYS[[Système de fichiers<br/>uploads/ · reports/]]
    RATE[Service de taux de change<br/>HTTP externe]
    SH[[Shell OS<br/>tar]]

    B -- HTTP / HTML --> I
    M -- HTTP / JSON --> I
    I --> C
    C --> S
    C --> R
    C --> T
    S --> R
    R -- JDBC --> DB
    FS --> FSYS
    RS --> FSYS
    RS --> SH
    XR -- HTTP --> RATE
    AC -- JDBC --> LEG
    C --> LOG
```

### Déploiement

```mermaid
flowchart LR
    U[Poste utilisateur] -->|":8080"| A
    subgraph Docker Compose
        A["conteneur app<br/>tomcat:9.0.60-jdk17<br/>webapps/ROOT.war"] -->|"JDBC :5432"| D["conteneur db<br/>postgres:11.15<br/>volume pgdata"]
    end
```

## 3. Organisation du code

```
src/main/java/com/formation/notefrais/
├── NoteFraisApplication.java      point d'entrée Spring Boot (exécution autonome)
├── ServletInitializer.java        démarrage dans un Tomcat externe (WAR)
├── config/
│   ├── AuthInterceptor.java       authentification, cookie "se souvenir de moi", accès /admin
│   ├── WebConfig.java             enregistrement de l'intercepteur, CORS de l'API
│   └── GlobalExceptionHandler.java page d'erreur
├── controller/                    couche web (pages Thymeleaf + API REST)
├── service/                       logique métier et intégrations (fichiers, shell, HTTP, XML)
├── repository/                    accès PostgreSQL via JdbcTemplate
├── model/                         User, Expense, ExpenseBatch, RememberMeToken
└── util/                          HashUtil (MD5, jetons), CookieSerializer
src/main/resources/
├── application.properties         configuration (datasource, session, actuator…)
├── db/schema.sql, db/data.sql     schéma et jeu de données
├── templates/                     vues Thymeleaf (dont help/fr.html, help/en.html)
└── static/css/style.css
```

## 4. Modèle de données

```mermaid
erDiagram
    USERS ||--o{ EXPENSES : "déclare"
    USERS {
        serial id PK
        varchar username UK
        varchar password "hash MD5"
        varchar full_name
        varchar email
        varchar role "EMPLOYEE | MANAGER | ADMIN"
        varchar iban
        text signature
        varchar reset_token
    }
    EXPENSES {
        serial id PK
        int user_id FK
        date expense_date
        varchar category "TRANSPORT | REPAS | HEBERGEMENT | AUTRE"
        text description
        numeric amount_ht
        numeric vat_rate
        numeric amount_ttc
        numeric reimbursable
        varchar status "SUBMITTED | APPROVED | REJECTED"
        varchar receipt_path
        timestamp created_at
    }
    AUDIT_LOG {
        serial id PK
        varchar username
        varchar action
        text details
        timestamp created_at
    }
```

## 5. Points d'entrée HTTP

| Méthode | URL | Contrôleur | Description |
|---|---|---|---|
| GET/POST | `/login` | LoginController | Formulaire et traitement de connexion |
| GET | `/logout` | LoginController | Déconnexion |
| GET/POST | `/reset`, `/reset/confirm` | LoginController | Mot de passe oublié (code à 6 chiffres) |
| GET | `/` | DashboardController | Récapitulatif mensuel |
| GET | `/expenses?q=&sort=` | ExpenseController | Liste / recherche des notes de l'utilisateur |
| GET | `/expenses/new` | ExpenseController | Formulaire de saisie |
| POST | `/expenses` | ExpenseController | Création (multipart, justificatif) |
| GET | `/expenses/{id}` | ExpenseController | Détail d'une note |
| GET | `/expenses/{id}/delete` | ExpenseController | Suppression |
| GET | `/expenses/receipt?file=` | ExpenseController | Téléchargement d'un justificatif |
| GET | `/expenses/pending` | ExpenseController | File de validation (managers) |
| POST | `/expenses/{id}/decision` | ExpenseController | Approbation / refus + notification |
| GET/POST | `/profile` | ProfileController | Email, IBAN, signature |
| GET | `/help?lang=` | HelpController | Aide en ligne (vue `help/<lang>`) |
| GET | `/admin` | AdminController | Utilisateurs, journal d'audit |
| POST | `/admin/export` | AdminController | Export CSV archivé en .tar.gz |
| POST | `/admin/import` | AdminController | Import XML de notes |
| GET | `/admin/check-url?url=` | AdminController | Test du service de taux |
| POST | `/admin/check-db` | AdminController | Test de connexion JDBC à la base de l'ancien outil |
| GET | `/api/expenses?userId=&q=&sort=` | ApiController | Notes d'un utilisateur (JSON) |
| POST | `/api/expenses/batch` | ApiController | Réception d'un lot de notes (JSON, voir 6.6) |
| GET | `/api/users/{id}` | ApiController | Fiche utilisateur (JSON) |
| GET | `/actuator/**` | Spring Actuator | Supervision |

## 6. Diagrammes de flux

### 6.1 Flux global (vue utilisateur)

```mermaid
flowchart TD
    A([Utilisateur]) --> L{Session ou cookie<br/>NF_REMEMBER valide ?}
    L -- non --> F[/login/] --> AUTH{Identifiants OK ?}
    AUTH -- non --> F
    AUTH -- oui --> D
    L -- oui --> D[Tableau de bord]
    D --> N[Saisir une note] --> CALC[Calcul TTC, conversion devise,<br/>plafond catégorie] --> SAVE[(INSERT expenses<br/>statut SUBMITTED)]
    D --> LST[Mes notes : recherche / tri]
    D --> R{Rôle ?}
    R -- MANAGER / ADMIN --> P[File de validation] --> DEC{Décision}
    DEC -- approuver --> AP[(UPDATE status = APPROVED)]
    DEC -- refuser --> RJ[(UPDATE status = REJECTED)]
    AP --> NOTIF[Message de notification]
    RJ --> NOTIF
    R -- ADMIN --> ADM[Administration]
    ADM --> EXP[Export comptable .tar.gz]
    ADM --> IMP[Import XML]
```

### 6.2 Authentification

```mermaid
sequenceDiagram
    actor U as Utilisateur
    participant I as AuthInterceptor
    participant LC as LoginController
    participant UR as UserRepository
    participant DB as PostgreSQL

    U->>I: GET /expenses
    I->>I: session.user ? sinon cookie NF_REMEMBER
    I-->>U: 302 /login?redirect=/expenses
    U->>LC: POST /login (username, password, rememberMe, redirect)
    LC->>LC: md5(password)
    LC->>UR: authenticate(username, hash)
    UR->>DB: SELECT * FROM users WHERE username=… AND password=…
    DB-->>UR: ligne utilisateur
    UR-->>LC: User
    LC->>DB: INSERT audit_log (LOGIN)
    LC-->>U: Set-Cookie JSESSIONID, NF_ROLE (+ NF_REMEMBER)<br/>302 vers "redirect"
```

### 6.3 Saisie et traitement d'une note de frais

```mermaid
sequenceDiagram
    actor U as Salarié
    participant EC as ExpenseController
    participant FS as FileStorageService
    participant ES as ExpenseService
    participant XR as ExchangeRateService
    participant ER as ExpenseRepository
    participant DB as PostgreSQL

    U->>EC: POST /expenses (multipart : champs + justificatif)
    EC->>EC: binding @ModelAttribute → Expense
    EC->>FS: store(receipt) → uploads/<nom d'origine>
    EC->>ES: submit(expense, currency, rateUrl)
    alt devise ≠ EUR
        ES->>XR: fetchRate(rateUrl, currency)
        XR-->>ES: taux
        ES->>ES: HT = HT × taux
    end
    ES->>ES: TTC = HT × (1 + TVA/100)
    ES->>ES: remboursable = min(TTC, plafond catégorie)
    ES->>ER: insert(expense)
    ER->>DB: INSERT INTO expenses …
    EC->>DB: INSERT audit_log (EXPENSE_CREATED)
    EC-->>U: 302 /expenses
```

### 6.4 Validation par un manager

```mermaid
sequenceDiagram
    actor M as Manager
    participant EC as ExpenseController
    participant ER as ExpenseRepository
    participant NS as NotificationService
    participant DB as PostgreSQL

    M->>EC: GET /expenses/pending
    EC->>ER: findByStatus(SUBMITTED)
    EC-->>M: liste
    M->>EC: POST /expenses/{id}/decision (approve | reject)
    EC->>ER: updateStatus(id, APPROVED | REJECTED)
    ER->>DB: UPDATE expenses SET status …
    EC->>NS: buildMessage(manager, note, décision)
    NS->>NS: modèle + signature du manager, interpolation des variables
    EC-->>M: page + message de notification
```

### 6.5 Export comptable (administrateur)

```mermaid
sequenceDiagram
    actor A as Admin
    participant AC as AdminController
    participant RS as ReportService
    participant DB as PostgreSQL
    participant SH as Shell (sh -c)

    A->>AC: POST /admin/export (name)
    AC->>RS: exportApproved(name)
    RS->>DB: SELECT … WHERE status = 'APPROVED'
    RS->>RS: écriture reports/export.csv
    RS->>SH: tar czf <name>.tar.gz export.csv
    SH-->>RS: sortie de la commande
    RS-->>AC: résultat
    AC-->>A: page admin + résultat
```

### 6.6 Synchronisation par lot (application mobile)

```mermaid
sequenceDiagram
    participant MOB as App mobile
    participant API as ApiController
    participant OM as ObjectMapper (typage par défaut)
    participant ES as ExpenseService
    participant DB as PostgreSQL

    MOB->>API: POST /api/expenses/batch (JSON)
    API->>OM: readValue(json, ExpenseBatch)
    OM-->>API: ExpenseBatch {source, metadata, expenses}
    loop pour chaque note
        API->>ES: submit(note, EUR)
        ES->>DB: INSERT INTO expenses …
    end
    API-->>MOB: "n note(s) importée(s)"
```

Format attendu (le typage par défaut de Jackson impose d'indiquer le type des champs non concrets) :

```json
{
  "source": "mobile-2.4",
  "metadata": ["java.util.HashMap", {"device": "Pixel 8"}],
  "expenses": ["java.util.ArrayList", [
    {"userId": 3, "expenseDate": "2026-11-19", "category": "TRANSPORT",
     "description": "Métro", "amountHt": 1.90, "vatRate": 10}
  ]]
}
```

## 7. Configuration

| Propriété | Rôle | Défaut |
|---|---|---|
| `DB_URL`, `DB_USER`, `DB_PASSWORD` | Connexion PostgreSQL | `jdbc:postgresql://localhost:5432/notefrais` |
| `UPLOAD_DIR` | Dossier des justificatifs | `./uploads` |
| `REPORT_DIR` | Dossier des exports | `./reports` |
| `spring.sql.init.mode=always` | Recrée le schéma au démarrage | — |
| `spring.mvc.format.date=iso` | Format des dates saisies (AAAA-MM-JJ) | — |
| `management.endpoints.web.exposure.include` | Endpoints Actuator exposés | `*` |
