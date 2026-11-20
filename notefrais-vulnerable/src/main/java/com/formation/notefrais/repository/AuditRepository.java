package com.formation.notefrais.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class AuditRepository {

    private final JdbcTemplate jdbc;

    public AuditRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public void log(String username, String action, String details) {
        jdbc.update("INSERT INTO audit_log (username, action, details) VALUES (?,?,?)",
                username, action, details);
    }

    public List<Map<String, Object>> latest(int limit) {
        return jdbc.queryForList("SELECT * FROM audit_log ORDER BY id DESC LIMIT " + limit);
    }
}
