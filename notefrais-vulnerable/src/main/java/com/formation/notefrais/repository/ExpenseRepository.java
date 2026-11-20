package com.formation.notefrais.repository;

import com.formation.notefrais.model.Expense;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Repository
public class ExpenseRepository {

    private final JdbcTemplate jdbc;

    private static final String BASE_SELECT =
            "SELECT e.*, u.full_name AS owner_name FROM expenses e JOIN users u ON u.id = e.user_id ";

    private static final RowMapper<Expense> MAPPER = (rs, i) -> {
        Expense e = new Expense();
        e.setId(rs.getInt("id"));
        e.setUserId(rs.getInt("user_id"));
        e.setOwnerName(rs.getString("owner_name"));
        e.setExpenseDate(rs.getDate("expense_date").toLocalDate());
        e.setCategory(rs.getString("category"));
        e.setDescription(rs.getString("description"));
        e.setAmountHt(rs.getBigDecimal("amount_ht"));
        e.setVatRate(rs.getBigDecimal("vat_rate"));
        e.setAmountTtc(rs.getBigDecimal("amount_ttc"));
        e.setReimbursable(rs.getBigDecimal("reimbursable"));
        e.setStatus(rs.getString("status"));
        e.setReceiptPath(rs.getString("receipt_path"));
        return e;
    };

    public ExpenseRepository(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    /** Recherche des notes de frais d'un utilisateur, avec filtre texte et tri. */
    public List<Expense> search(int userId, String keyword, String sort) {
        String sql = BASE_SELECT + "WHERE e.user_id = " + userId;
        if (keyword != null && !keyword.isBlank()) {
            sql += " AND e.description ILIKE '%" + keyword + "%'";
        }
        sql += " ORDER BY " + (sort == null || sort.isBlank() ? "e.expense_date DESC" : sort);
        return jdbc.query(sql, MAPPER);
    }

    public List<Expense> findByStatus(String status) {
        return jdbc.query(BASE_SELECT + "WHERE e.status = ? ORDER BY e.expense_date", MAPPER, status);
    }

    public List<Expense> findAll() {
        return jdbc.query(BASE_SELECT + "ORDER BY e.id", MAPPER);
    }

    public Expense findById(int id) {
        List<Expense> list = jdbc.query(BASE_SELECT + "WHERE e.id = ?", MAPPER, id);
        return list.isEmpty() ? null : list.get(0);
    }

    public void insert(Expense e) {
        jdbc.update("INSERT INTO expenses (user_id, expense_date, category, description, amount_ht, vat_rate, "
                        + "amount_ttc, reimbursable, status, receipt_path) VALUES (?,?,?,?,?,?,?,?,?,?)",
                e.getUserId(), e.getExpenseDate(), e.getCategory(), e.getDescription(), e.getAmountHt(),
                e.getVatRate(), e.getAmountTtc(), e.getReimbursable(), e.getStatus(), e.getReceiptPath());
    }

    public void updateStatus(int id, String status) {
        jdbc.update("UPDATE expenses SET status = ? WHERE id = ?", status, id);
    }

    public void delete(int id) {
        jdbc.update("DELETE FROM expenses WHERE id = ?", id);
    }

    /** Totaux remboursables par mois pour le tableau de bord. */
    public List<Map<String, Object>> monthlyTotals(int userId) {
        return jdbc.queryForList(
                "SELECT to_char(expense_date, 'YYYY-MM') AS month, count(*) AS nb, "
                        + "sum(amount_ttc) AS total_ttc, sum(reimbursable) AS total_reimbursable "
                        + "FROM expenses WHERE user_id = ? AND status <> 'REJECTED' "
                        + "GROUP BY 1 ORDER BY 1 DESC", userId);
    }

    public BigDecimal totalPending() {
        return jdbc.queryForObject(
                "SELECT coalesce(sum(reimbursable),0) FROM expenses WHERE status = 'SUBMITTED'",
                BigDecimal.class);
    }
}
