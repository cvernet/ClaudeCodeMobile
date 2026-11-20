-- Mots de passe : admin/Admin2024!  mmartin/manager  jdupont/employe123  slefevre/azerty
INSERT INTO users (username, password, full_name, email, role, iban, signature) VALUES
 ('admin',    '77d785ade3d3454401448b143abd34b0', 'Administrateur',   'admin@notefrais.local',   'ADMIN',    'FR7630006000011234567890189', 'L''administrateur'),
 ('mmartin',  '1d0258c2440a8d19e716292b231e3190', 'Marie Martin',     'm.martin@notefrais.local','MANAGER',  'FR7610107001011234567890129', 'Marie, responsable du service'),
 ('jdupont',  '5e146d35b747a6da7dbecae5310fbf20', 'Jean Dupont',      'j.dupont@notefrais.local','EMPLOYEE', 'FR7614508000301234567890124', 'Cordialement, Jean'),
 ('slefevre', 'ab4f63f9ac65152575886860dde480a1', 'Sophie Lefèvre',   's.lefevre@notefrais.local','EMPLOYEE','FR7612548029981234567890161', 'Sophie');

INSERT INTO expenses (user_id, expense_date, category, description, amount_ht, vat_rate, amount_ttc, reimbursable, status) VALUES
 (3, '2026-10-02', 'TRANSPORT',   'Train Paris - Lyon (client Acme)',  95.00, 10, 104.50, 104.50, 'APPROVED'),
 (3, '2026-10-02', 'REPAS',       'Déjeuner client Acme',              42.50, 10,  46.75,  25.00, 'APPROVED'),
 (3, '2026-10-15', 'HEBERGEMENT', 'Hôtel Lyon 1 nuit',                110.00, 10, 121.00, 120.00, 'SUBMITTED'),
 (4, '2026-10-20', 'TRANSPORT',   'Taxi aéroport',                     40.00, 10,  44.00,  44.00, 'SUBMITTED'),
 (4, '2026-11-03', 'AUTRE',       'Fournitures de bureau',             18.30, 20,  21.96,  21.96, 'REJECTED'),
 (2, '2026-11-05', 'REPAS',       'Repas équipe',                     150.00, 10, 165.00,  25.00, 'SUBMITTED');
