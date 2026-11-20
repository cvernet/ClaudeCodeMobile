package com.formation.notefrais.model;

import java.util.List;

/** Lot de notes de frais envoyé par l'application mobile ou l'outil comptable. */
public class ExpenseBatch {
    private String source;
    /** Métadonnées libres propres à chaque client (version de l'app, appareil, etc.). */
    private Object metadata;
    private List<Expense> expenses;

    public String getSource() { return source; }
    public void setSource(String source) { this.source = source; }
    public Object getMetadata() { return metadata; }
    public void setMetadata(Object metadata) { this.metadata = metadata; }
    public List<Expense> getExpenses() { return expenses; }
    public void setExpenses(List<Expense> expenses) { this.expenses = expenses; }
}
