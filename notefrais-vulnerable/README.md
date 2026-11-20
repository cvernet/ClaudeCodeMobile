# NoteFrais : application de gestion des notes de frais (volontairement vulnérable)

> ⚠️ **Application pédagogique, vulnérable par conception.**
> Elle contient de nombreuses failles de sécurité introduites volontairement. Elle sert de cible
> à un agent IA d'analyse de code source dans le cadre d'une formation.
> **Ne jamais la déployer sur un réseau accessible ni avec des données réelles.**
> Exécutez-la uniquement en local (le port 8080 est lié à `127.0.0.1` dans `docker-compose.yml`).

## Fonctionnalités

| Profil | Fonctions |
|---|---|
| API | Consultation JSON, synchronisation par lot depuis l'application mobile |
| Salarié | Connexion, tableau de bord mensuel, aide en ligne (FR/EN), saisie d'une note (montant HT, TVA, devise, justificatif), recherche/tri, consultation, suppression, profil (email, IBAN, signature) |
| Manager | + file des notes à valider, approbation / refus avec message de notification |
| Admin | + liste des utilisateurs, journal d'audit, export comptable (.tar.gz), import XML, test du service de taux de change, test de connexion à la base de l'ancien outil |

Traitement métier (`ExpenseService`) : calcul TTC = HT × (1 + TVA), conversion de devise,
application des plafonds par catégorie (Repas 25 €, Hébergement 120 €, Autre 50 €, Transport sans plafond).

## Stack

Java 17 · Spring Boot 2.6.5 / Spring Framework 5.3.17 (Spring MVC, Thymeleaf 3.0.11, JdbcTemplate, Actuator) · Log4j 2.14.1 · Jackson 2.10.0 · PostgreSQL 11 (driver JDBC 42.3.1) · WAR déployé sur Tomcat 9.0.60 · Maven · Docker Compose

> La pile est **volontairement figée sur des versions obsolètes** (voir le corrigé, section « Composants obsolètes »).

## Lancement

```bash
# Option 1 : tout en conteneurs
docker compose up --build
# -> http://localhost:8080

# Option 2 : base en conteneur, application en local (JDK 17 ou plus)
docker compose up -d db
mvn spring-boot:run
# ou : mvn package && java -jar target/notefrais-1.0.0.war
```

Le schéma et les données de démonstration sont (re)créés à chaque démarrage (`src/main/resources/db/`).

### Comptes de démonstration

| Identifiant | Mot de passe | Rôle |
|---|---|---|
| admin | Admin2024! | ADMIN |
| mmartin | manager | MANAGER |
| jdupont | employe123 | EMPLOYEE |
| slefevre | azerty | EMPLOYEE |

## Documentation

- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) : documentation technique, schéma d'architecture, modèle de données, diagrammes de flux
- [`docs/VULNERABILITES.md`](docs/VULNERABILITES.md) : **corrigé formateur** : liste des failles introduites

> 💡 Pour l'exercice, retirez `docs/VULNERABILITES.md` (et ce paragraphe) de la copie remise à l'agent :
> il sert de référence pour mesurer ce que l'agent a trouvé ou manqué.
