package com.formation.notefrais.model;

import java.io.Serializable;

/** Jeton "se souvenir de moi", stocké dans un cookie sous forme sérialisée. */
public class RememberMeToken implements Serializable {
    private static final long serialVersionUID = 1L;

    private final String username;
    private final String role;
    private final long issuedAt;

    public RememberMeToken(String username, String role) {
        this.username = username;
        this.role = role;
        this.issuedAt = System.currentTimeMillis();
    }

    public String getUsername() { return username; }
    public String getRole() { return role; }
    public long getIssuedAt() { return issuedAt; }
}
