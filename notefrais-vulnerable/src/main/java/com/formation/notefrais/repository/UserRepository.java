package com.formation.notefrais.repository;

import com.formation.notefrais.model.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbc;

    private static final RowMapper<User> MAPPER = (rs, i) -> {
        User u = new User();
        u.setId(rs.getInt("id"));
        u.setUsername(rs.getString("username"));
        u.setPassword(rs.getString("password"));
        u.setFullName(rs.getString("full_name"));
        u.setEmail(rs.getString("email"));
        u.setRole(rs.getString("role"));
        u.setIban(rs.getString("iban"));
        u.setSignature(rs.getString("signature"));
        return u;
    };

    public UserRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public User authenticate(String username, String passwordHash) {
        String sql = "SELECT * FROM users WHERE username = '" + username
                + "' AND password = '" + passwordHash + "'";
        List<User> users = jdbc.query(sql, MAPPER);
        return users.isEmpty() ? null : users.get(0);
    }

    public User findByUsername(String username) {
        List<User> users = jdbc.query("SELECT * FROM users WHERE username = ?", MAPPER, username);
        return users.isEmpty() ? null : users.get(0);
    }

    public User findById(int id) {
        List<User> users = jdbc.query("SELECT * FROM users WHERE id = ?", MAPPER, id);
        return users.isEmpty() ? null : users.get(0);
    }

    public List<User> findAll() {
        return jdbc.query("SELECT * FROM users ORDER BY id", MAPPER);
    }

    public void updateProfile(int id, String email, String iban, String signature) {
        jdbc.update("UPDATE users SET email = ?, iban = ?, signature = ? WHERE id = ?",
                email, iban, signature, id);
    }

    public void updatePassword(String username, String passwordHash) {
        jdbc.update("UPDATE users SET password = ?, reset_token = NULL WHERE username = ?",
                passwordHash, username);
    }

    public void setResetToken(String username, String token) {
        jdbc.update("UPDATE users SET reset_token = ? WHERE username = ?", token, username);
    }

    public boolean checkResetToken(String username, String token) {
        Integer n = jdbc.queryForObject(
                "SELECT count(*) FROM users WHERE username = ? AND reset_token = ?",
                Integer.class, username, token);
        return n != null && n > 0;
    }
}
