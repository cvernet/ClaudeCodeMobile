DROP TABLE IF EXISTS audit_log;
DROP TABLE IF EXISTS expenses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    password      VARCHAR(64)  NOT NULL,          -- hash MD5
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(100),
    role          VARCHAR(20)  NOT NULL DEFAULT 'EMPLOYEE', -- EMPLOYEE | MANAGER | ADMIN
    iban          VARCHAR(34),
    signature     TEXT,
    reset_token   VARCHAR(20)
);

CREATE TABLE expenses (
    id            SERIAL PRIMARY KEY,
    user_id       INTEGER      NOT NULL REFERENCES users(id),
    expense_date  DATE         NOT NULL,
    category      VARCHAR(30)  NOT NULL,          -- TRANSPORT | REPAS | HEBERGEMENT | AUTRE
    description   TEXT,
    amount_ht     NUMERIC(10,2) NOT NULL,
    vat_rate      NUMERIC(4,2)  NOT NULL DEFAULT 20,
    amount_ttc    NUMERIC(10,2) NOT NULL,
    reimbursable  NUMERIC(10,2) NOT NULL,
    status        VARCHAR(20)  NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED | APPROVED | REJECTED
    receipt_path  VARCHAR(255),
    created_at    TIMESTAMP    NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (
    id          SERIAL PRIMARY KEY,
    username    VARCHAR(50),
    action      VARCHAR(50),
    details     TEXT,
    created_at  TIMESTAMP NOT NULL DEFAULT now()
);
