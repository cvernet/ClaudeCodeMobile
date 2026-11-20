# Corrigé formateur : failles introduites dans NoteFrais

> Ce document est la **référence de l'exercice**. Ne le fournissez pas à l'agent analysé : il sert à
> mesurer ce que l'agent a trouvé (vrais positifs), manqué (faux négatifs) ou inventé (faux positifs).

Légende sévérité : 🔴 critique · 🟠 haute · 🟡 moyenne · 🔵 faible

## Synthèse

| # | Faille | CWE | OWASP 2021 | Sév. | Emplacement |
|---|---|---|---|---|---|
| V01 | Injection SQL à l'authentification | CWE-89 | A03 | 🔴 | `UserRepository.authenticate` |
| V02 | Injection SQL dans la recherche (`q`) | CWE-89 | A03 | 🔴 | `ExpenseRepository.search` |
| V03 | Injection SQL dans le tri (`sort`, clause ORDER BY) | CWE-89 | A03 | 🔴 | `ExpenseRepository.search` |
| V04 | Injection de commande OS | CWE-78 | A03 | 🔴 | `ReportService.exportApproved` |
| V05 | Injection d'expression (Text4Shell, CVE-2022-42889) | CWE-94 | A03 | 🔴 | `NotificationService.buildMessage` + `commons-text 1.9` |
| V06 | Désérialisation non sûre du cookie `NF_REMEMBER` | CWE-502 | A08 | 🔴 | `CookieSerializer.deserialize`, `AuthInterceptor.restoreFromRememberMe` |
| V07 | XXE dans l'import XML | CWE-611 | A05 | 🟠 | `ImportService.parse` |
| V08 | SSRF (URL du service de taux fournie par le client) | CWE-918 | A10 | 🟠 | `ExchangeRateService.fetch`, champ caché `rateUrl`, `/admin/check-url` |
| V09 | Path traversal en lecture des justificatifs | CWE-22 | A01 | 🟠 | `FileStorageService.load`, `ExpenseController.receipt` |
| V10 | Upload non restreint et path traversal en écriture | CWE-434 / CWE-22 | A04 | 🟠 | `FileStorageService.store` |
| V11 | Rôle administrateur lu dans un cookie client (`NF_ROLE`) | CWE-565 / CWE-602 | A01 | 🔴 | `AuthInterceptor.preHandle`, `LoginController.login` |
| V12 | Contournement de l'authentification par suffixe `.css`/`.js` | CWE-288 | A01 | 🔴 | `AuthInterceptor.preHandle` |
| V13 | Endpoints Actuator publics (env avec valeurs, heapdump…) | CWE-215 / CWE-200 | A05 | 🔴 | `application.properties`, `AuthInterceptor` (exclusion `/actuator`) |
| V14 | IDOR : consultation / suppression de la note d'autrui | CWE-639 | A01 | 🟠 | `ExpenseController.view`, `ExpenseController.delete` |
| V15 | IDOR API : notes et fiche (hash, IBAN) de n'importe quel utilisateur | CWE-639 | A01 | 🟠 | `ApiController.expenses`, `ApiController.user` |
| V16 | Validation sans contrôle de rôle ; un manager peut valider ses propres notes | CWE-285 | A01 | 🟠 | `ExpenseController.pending`, `ExpenseController.decide` |
| V17 | Mass assignment (`status`, `userId`) | CWE-915 | A04 | 🟠 | `ExpenseController.create` (`@ModelAttribute Expense`) |
| V18 | Absence de validation métier (montants négatifs, catégorie libre, TVA libre) | CWE-20 / CWE-840 | A04 | 🟡 | `ExpenseService.compute` |
| V19 | XSS réfléchi (terme recherché) | CWE-79 | A03 | 🟡 | `templates/expenses/list.html` (`th:utext="${q}"`) |
| V20 | XSS stocké (description, journal d'audit, notification) | CWE-79 | A03 | 🟠 | `list.html`, `view.html`, `pending.html`, `admin/index.html` (`th:utext`) |
| V21 | Absence de protection CSRF ; suppression via GET | CWE-352 | A01 | 🟡 | Tous les formulaires POST, `ExpenseController.delete` |
| V22 | CORS permissif avec credentials | CWE-942 | A05 | 🟡 | `WebConfig.addCorsMappings` |
| V23 | Open redirect après connexion | CWE-601 | A01 | 🟡 | `LoginController.login` (paramètre `redirect`) |
| V24 | Hachage MD5 sans sel | CWE-327 / CWE-916 | A02 | 🟠 | `HashUtil.md5` |
| V25 | Jeton de réinitialisation prévisible, sans expiration ni limitation d'essais | CWE-330 / CWE-307 / CWE-640 | A07 | 🟠 | `HashUtil.resetToken`, `LoginController.confirmReset` |
| V26 | Énumération des comptes | CWE-204 | A07 | 🔵 | `LoginController.requestReset` |
| V27 | Fixation de session / jeton « se souvenir » non signé, valable 1 an, non révoqué à la déconnexion | CWE-384 / CWE-613 | A07 | 🟡 | `LoginController.login`, `LoginController.logout` |
| V28 | Cookies sans `HttpOnly` / `Secure`, session de 7 jours, `jsessionid` dans l'URL | CWE-1004 / CWE-614 | A05 | 🟡 | `application.properties` |
| V29 | Mots de passe et jetons écrits dans les logs et l'audit | CWE-532 | A09 | 🟠 | `LoginController.login`, `LoginController.requestReset` |
| V30 | Injection dans les logs (concaténation de données utilisateur) | CWE-117 | A09 | 🔵 | `LoginController.login` |
| V31 | Secrets en dur (BD, mot de passe admin, clé d'API, comptes en commentaire HTML) | CWE-798 / CWE-615 | A07 | 🟠 | `application.properties`, `docker-compose.yml`, `login.html`, `data.sql` |
| V32 | Divulgation des stack traces | CWE-209 | A05 | 🟡 | `GlobalExceptionHandler`, `server.error.*` |
| V33 | Composants vulnérables (`commons-text 1.9`, `commons-collections 3.2.1`) | CWE-1395 | A06 | 🔴 | `pom.xml` |
| V34 | Durcissement conteneur : PostgreSQL exposé, application exécutée en root | CWE-250 | A05 | 🔵 | `docker-compose.yml`, `Dockerfile` |
| V35 | Concaténation SQL dans `LIMIT` (non exploitable : paramètre `int`, mauvaise pratique) | CWE-89 | — | 🔵 | `AuditRepository.latest` |
| V36 | Spring4Shell (CVE-2022-22965) : Spring 5.3.17 + WAR sur Tomcat 9.0.60 + JDK 17 + binding de POJO | CWE-94 | A06 | 🔴 | `pom.xml`, `Dockerfile`, `ExpenseController.create` |
| V37 | Log4Shell (CVE-2021-44228, CVE-2021-45046) : Log4j 2.14.1 + journalisation de données non authentifiées | CWE-917 | A06 | 🔴 | `pom.xml` (`log4j2.version`), `LoginController.login` |
| V38 | Injection de template côté serveur via le nom de vue (Thymeleaf 3.0.11) | CWE-1336 | A03 | 🔴 | `HelpController.help`, `pom.xml` (`thymeleaf.version`) |
| V39 | Désérialisation polymorphe Jackson (typage par défaut, databind 2.10.0) | CWE-502 | A08 | 🔴 | `ApiController` (constructeur, `batch`), `pom.xml` |
| V40 | Driver PostgreSQL 42.3.1 (CVE-2022-21724) + URL JDBC fournie par l'utilisateur | CWE-470 / CWE-918 | A06 | 🟠 | `AdminController.checkDb`, `pom.xml` |
| V41 | Plateforme hors support : Spring Boot 2.6, Tomcat 9.0.60, PostgreSQL 11 | CWE-1104 | A06 | 🟡 | `pom.xml`, `Dockerfile`, `docker-compose.yml` |

## Détail et remédiations

### Injections

**V01 à V03 : injection SQL.** Les requêtes sont construites par concaténation de chaînes
(`"... WHERE username = '" + username + "'"`, `ILIKE '%" + keyword + "%'`, `ORDER BY " + sort`).
*Remédiation :* requêtes paramétrées (`jdbc.query(sql, mapper, args...)`) ; pour `ORDER BY`, liste
blanche de colonnes/directions côté serveur.

**V04 : injection de commande.** Le nom d'archive est inséré dans une ligne passée à `sh -c`.
*Remédiation :* ne pas passer par un shell ; générer l'archive en Java (`GZIPOutputStream`/commons-compress)
ou `ProcessBuilder` avec arguments séparés, et valider le nom par expression régulière (`[A-Za-z0-9_-]+`).

**V05 : Text4Shell.** `StringSubstitutor.createInterpolator()` (commons-text ≤ 1.9) interprète les
préfixes `script:`, `dns:`, `url:`… La signature du manager (modifiable dans le profil) est interpolée.
*Remédiation :* monter en version ≥ 1.10 et ne jamais interpoler de données utilisateur ; utiliser un
`StringSubstitutor` restreint à une `Map` de variables connues.

**V07 : XXE.** `DocumentBuilderFactory` utilisé avec la configuration par défaut.
*Remédiation :* `dbf.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true)`,
`setExpandEntityReferences(false)`, `XMLConstants.FEATURE_SECURE_PROCESSING`.

### Contrôle d'accès

**V11 :** l'accès à `/admin` dépend d'un cookie que le client peut modifier. *Remédiation :* lire le rôle
dans la session côté serveur (ou utiliser Spring Security avec `hasRole('ADMIN')`).

**V12 :** l'intercepteur laisse passer toute URI se terminant par `.css`/`.js`, et Spring MVC ignore
le contenu après `;` lors du routage. Une URI du type `/api/users/1;.css` atteint donc le contrôleur sans
authentification. *Remédiation :* servir les statiques depuis un chemin dédié (`/css/**`) et raisonner
sur le chemin normalisé, ou utiliser Spring Security.

**V13 :** `/actuator` est exclu de l'authentification alors que `include=*` et `show-values=ALWAYS`
exposent variables d'environnement (mot de passe BD), heapdump, mappings…
*Remédiation :* n'exposer que `health`, protéger le reste, port de management séparé.

**V14 à V16 :** aucune vérification que la note appartient à l'utilisateur courant, que l'utilisateur
de l'API correspond à la session, ni que l'appelant de `/decision` est manager (le menu est seulement
masqué côté IHM). *Remédiation :* contrôles d'appartenance et de rôle côté serveur, séparation des tâches
(un manager ne valide pas ses notes), DTO de sortie sans `password`.

**V17 : mass assignment.** Le binding `@ModelAttribute Expense` accepte `status=APPROVED` ou `userId=…`.
*Remédiation :* DTO de formulaire ne contenant que les champs saisissables, `@InitBinder setAllowedFields`.

**V18 : logique métier.** Aucune validation : montant négatif → remboursement négatif ou crédit,
catégorie inconnue → pas de plafond, TVA arbitraire. *Remédiation :* Bean Validation (`@Positive`,
`@DecimalMax`), énumérations pour catégorie et TVA.

### Fichiers et réseau

**V08 : SSRF.** L'URL est fournie par le client (champ caché `rateUrl`, outil admin) et lue avec
`URL.openStream()` (supporte aussi `file:`). *Remédiation :* URL du service en configuration serveur,
liste blanche de schéma/hôte, blocage des adresses internes.

**V09 / V10 : fichiers.** Le nom d'origine du fichier est utilisé tel quel, en écriture comme en lecture,
sans contrôle d'extension/type/taille. *Remédiation :* nom généré (UUID), vérification
`path.normalize().startsWith(uploadDir)`, liste blanche de types (PDF/JPEG/PNG), taille maximale
raisonnable, stockage hors webroot, `Content-Disposition: attachment`.

### Données et cryptographie

**V24 :** MD5 sans sel. *Remédiation :* BCrypt / Argon2 (`PasswordEncoder`).
**V25 / V26 :** `java.util.Random`, 6 chiffres, sans expiration ni compteur d'essais ; message différent
si le compte n'existe pas. *Remédiation :* `SecureRandom`, jeton long à usage unique avec expiration,
limitation de débit, message neutre.
**V27 / V28 :** pas de régénération de l'identifiant de session à la connexion
(`request.changeSessionId()`), jeton « se souvenir de moi » non signé et non révoqué, cookies non
`HttpOnly`/`Secure`. *Remédiation :* régénération de session, jeton aléatoire stocké côté serveur
(hashé) avec expiration, `server.servlet.session.tracking-modes=cookie`, attributs `HttpOnly`,
`Secure`, `SameSite`.
**V29 à V31 :** mots de passe saisis journalisés (log applicatif et table `audit_log`), code de
réinitialisation journalisé, secrets dans le dépôt. *Remédiation :* ne jamais journaliser de secrets,
logs paramétrés + encodage, gestionnaire de secrets / variables d'environnement sans valeur par défaut.

### Configuration et dépendances

**V06 / V33 :** `ObjectInputStream.readObject()` sur un cookie contrôlé par le client, avec une chaîne de
gadgets disponible dans le classpath (`commons-collections 3.2.1`). *Remédiation :* ne jamais désérialiser
de données non fiables (utiliser un jeton opaque ou JSON signé), filtre `ObjectInputFilter`, retirer
les dépendances inutiles, scan SCA (OWASP Dependency-Check, `mvn versions`).
**V19 / V20 :** `th:utext` désactive l'échappement. *Remédiation :* `th:text`, CSP.
**V21 / V22 :** pas de jeton CSRF ; CORS `allowedOriginPatterns("*")` + `allowCredentials(true)`.
*Remédiation :* Spring Security (CSRF activé), méthodes POST/DELETE pour les modifications, origines
explicites.
**V32 :** stack traces renvoyées à l'utilisateur. *Remédiation :* page d'erreur générique, détails en log.
**V34 :** port 5432 publié, image sans `USER`. *Remédiation :* réseau interne Compose, utilisateur non root.

### Composants obsolètes : présence ou atteignabilité

Un scanner de dépendances (OWASP Dependency-Check, Snyk, `mvn dependency-check`) signale une version
vulnérable. Un bon agent doit aller plus loin : dire **si la faille est atteignable dans ce code**,
par quel point d'entrée et sous quelles conditions de déploiement.

| # | Composant (version) | Présent | Atteignable | Chemin / conditions |
|---|---|---|---|---|
| V33a | commons-text 1.9 | oui | **oui** | Signature du profil manager → `NotificationService.buildMessage` (`StringSubstitutor.createInterpolator`) |
| V33b | commons-collections 3.2.1 | oui | **oui, comme gadget** | N'est pas appelé directement ; fournit la chaîne de gadgets pour V06 (cookie) et V39 (Jackson) |
| V36 | Spring Framework 5.3.17 | oui | **oui en Docker**, non en `java -jar` | Conditions de CVE-2022-22965 : JDK ≥ 9, WAR sur Tomcat externe (`Dockerfile`, Tomcat 9.0.60 < 9.0.62), binding `@ModelAttribute Expense` dans `ExpenseController.create`. Avec le Tomcat embarqué (`java -jar`), la technique publique ne s'applique pas. |
| V37 | Log4j 2.14.1 | oui | **oui, sans authentification** | En-tête `User-Agent` et champ `username` concaténés dans `log.info`/`log.warn` de `LoginController.login`, avant toute authentification. Les lookups s'appliquent aussi aux messages passés par SLF4J. |
| V38 | Thymeleaf 3.0.11 | oui | **oui** | `HelpController.help` renvoie `"help/" + lang` : le paramètre devient un nom de vue évalué par Thymeleaf (expressions de prétraitement `__...__`). Les versions ≥ 3.0.12 ajoutent des protections, partielles jusqu'à 3.0.14 (CVE-2021-43466). |
| V39 | jackson-databind 2.10.0 | oui | **oui** | `enableDefaultTyping()` + champ `Object metadata` dans `ExpenseBatch` : le JSON choisit la classe instanciée. La liste de blocage de gadgets de 2.10.0 est incomplète (nombreuses CVE corrigées en 2.10.x/2.12.x). La version expose aussi CVE-2020-36518 (déni de service par imbrication profonde) sur tout endpoint JSON. |
| V40 | postgresql JDBC 42.3.1 | oui | **oui, par un admin** (ou via V11/V12) | `AdminController.checkDb` passe l'URL JDBC saisie à `DriverManager.getConnection`. CVE-2022-21724 : les propriétés `socketFactory`/`sslfactory` de l'URL instancient une classe arbitraire. Même sans la CVE : connexion sortante vers un hôte choisi (SSRF) et fuite des identifiants saisis. |
| V41 | Spring Boot 2.6, Tomcat 9.0.60, PostgreSQL 11 | oui | non exploitable directement dans ce code | Versions sans correctifs de sécurité (Spring Boot 2.6 : fin du support OSS en novembre 2022 ; PostgreSQL 11 : fin de vie en novembre 2023). Risque de plateforme, à signaler sans l'exagérer. |

**Remédiations.** Monter la pile sur des branches maintenues (Spring Boot 3.x, Java 21, Tomcat 10.1,
PostgreSQL 16+, Log4j ≥ 2.17.1 ou Logback, jackson-databind 2.17+, driver PostgreSQL ≥ 42.7) et
corriger aussi le code fautif, car une montée de version seule ne suffit pas toujours :
- V36 : `@InitBinder` avec `setAllowedFields`/DTO de formulaire.
- V37 : journalisation paramétrée (`log.info("… {}", value)`) et neutralisation des retours à la ligne.
- V38 : liste blanche des langues (`Set.of("fr", "en")`) avant de construire le nom de vue.
- V39 : supprimer `enableDefaultTyping()` et typer `metadata` (`Map<String, String>`), ou utiliser
  `activateDefaultTyping` avec un `PolymorphicTypeValidator` restrictif.
- V40 : URL de la base de reprise en configuration serveur, jamais saisie dans l'IHM.
- Ajouter un contrôle automatique des dépendances dans la CI (Dependabot, OWASP Dependency-Check).

## Pistes pour l'évaluation de l'agent

- **Rappel** : nombre de V01 à V41 détectées / 41 (pondérer par la sévérité).
- **Précision** : part des alertes de l'agent qui correspondent réellement à une faille.
- **Localisation** : fichier et méthode corrects ?
- **Qualité** : CWE juste, explication du scénario d'exploitation, correctif proposé applicable.
- Failles « difficiles » qui distinguent un bon agent d'un simple grep : V12 (bypass par suffixe),
  V11 (rôle dans un cookie), V16/V17 (logique d'autorisation), V18 (logique métier), V05/V06
  (combinaison code + dépendance vulnérable), V25 (jeton faible + absence de limitation).
- Pour les composants obsolètes (V33, V36 à V41), noter séparément : la **détection** de la version
  vulnérable, puis l'**analyse d'atteignabilité** (point d'entrée, conditions de déploiement). Un agent
  qui signale V36 sans mentionner la dépendance au mode WAR/Tomcat, ou V41 comme « critique », montre
  qu'il recopie un scanner sans raisonner sur le code.
