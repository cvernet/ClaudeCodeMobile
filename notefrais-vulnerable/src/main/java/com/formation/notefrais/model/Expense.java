package com.formation.notefrais.model;

import java.math.BigDecimal;
import java.time.LocalDate;

public class Expense {
    private Integer id;
    private Integer userId;
    private String ownerName;
    private LocalDate expenseDate;
    private String category;
    private String description;
    private BigDecimal amountHt;
    private BigDecimal vatRate;
    private BigDecimal amountTtc;
    private BigDecimal reimbursable;
    private String status = "SUBMITTED";
    private String receiptPath;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public Integer getUserId() { return userId; }
    public void setUserId(Integer userId) { this.userId = userId; }
    public String getOwnerName() { return ownerName; }
    public void setOwnerName(String ownerName) { this.ownerName = ownerName; }
    public LocalDate getExpenseDate() { return expenseDate; }
    public void setExpenseDate(LocalDate expenseDate) { this.expenseDate = expenseDate; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public BigDecimal getAmountHt() { return amountHt; }
    public void setAmountHt(BigDecimal amountHt) { this.amountHt = amountHt; }
    public BigDecimal getVatRate() { return vatRate; }
    public void setVatRate(BigDecimal vatRate) { this.vatRate = vatRate; }
    public BigDecimal getAmountTtc() { return amountTtc; }
    public void setAmountTtc(BigDecimal amountTtc) { this.amountTtc = amountTtc; }
    public BigDecimal getReimbursable() { return reimbursable; }
    public void setReimbursable(BigDecimal reimbursable) { this.reimbursable = reimbursable; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public String getReceiptPath() { return receiptPath; }
    public void setReceiptPath(String receiptPath) { this.receiptPath = receiptPath; }
}
