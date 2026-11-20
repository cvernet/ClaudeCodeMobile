package com.formation.notefrais.model;

import java.io.Serializable;

public class User implements Serializable {
    private static final long serialVersionUID = 1L;

    private Integer id;
    private String username;
    private String password;
    private String fullName;
    private String email;
    private String role;
    private String iban;
    private String signature;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getIban() { return iban; }
    public void setIban(String iban) { this.iban = iban; }
    public String getSignature() { return signature; }
    public void setSignature(String signature) { this.signature = signature; }

    public boolean isManager() { return "MANAGER".equals(role) || "ADMIN".equals(role); }
    public boolean isAdmin() { return "ADMIN".equals(role); }
}
