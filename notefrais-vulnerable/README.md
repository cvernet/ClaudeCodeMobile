# NoteFrais : application de gestion des notes de frais (volontairement vulnérable)

> ⚠️ **Application pédagogique, vulnérable par conception.**
> Elle contient de nombreuses failles de sécurité introduites volontairement. Elle sert de cible
> à un agent IA d'analyse de code source dans le cadre d'une formation.
> **Ne jamais la déployer sur un réseau accessible ni avec des données réelles.**
> Exécutez-la uniquement en local (le port 8080 est lié à `127.0.0.1` dans `docker-compose.yml`).

## Fonctionnalités

| Profil | Fonctions |
|---|---|
| Salarié | Connexion, tableau de bord mensuel, saisie d'une note (montant HT, TVA, devise, justificatif), recherche/tri, consultation, suppression, profil (email, IBAN, signature) |
| Manager | + file des notes à valider, approbation / refus avec message de notification |
| Admin | + liste des utilisateurs, journal d'audit, export comptable (.tar.gz), import XML, test du service de taux de change |

Traitement métier (`ExpenseService`) : calcul TTC = HT × (1 + TVA), conversion de devise,
application des plafonds par catégorie (Repas 25 €, Hébergement 120 €, Autre 50 €, Transport sans plafond).

## Stack

Java 21 · Spring Boot 3.3 (Spring MVC, Thymeleaf, JdbcTemplate, Actuator) · PostgreSQL 16 · Maven · Docker Compose

## Lancement

```bash
# Option 1 : tout en conteneurs
docker compose up --build
# -> http://localhost:8080

# Option 2 : base en conteneur, application en local
docker compose up -d db
mvn spring-boot:run
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
