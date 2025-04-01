package com.expensesage.model;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType; // Added
import jakarta.persistence.Enumerated; // Added
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "expense")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Expense {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 3)
    private String currency = "USD";

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SplitType splitType = SplitType.EQUAL;

    @Column(length = 500) // Optional notes field, adjust length as needed
    private String notes;

    @Column(length = 1024) // Store URL for the receipt
    private String receiptUrl;

    // Relationships
    // Removed paidBy field
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "paid_by_user_id", nullable = false)
    // private User paidBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    // Relationship to Payers
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<ExpensePayer> payers = new HashSet<>();

    // Relationship to Splits
    @OneToMany(mappedBy = "expense", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<Split> splits = new HashSet<>();

    // Helper methods for managing relationships
    public void addPayer(ExpensePayer payer) {
        payers.add(payer);
        payer.setExpense(this);
    }

    public void removePayer(ExpensePayer payer) {
        payers.remove(payer);
        payer.setExpense(null);
    }

    public void addSplit(Split split) {
        splits.add(split);
        split.setExpense(this);
    }

    public void removeSplit(Split split) {
        splits.remove(split);
        split.setExpense(null);
    }

    // --- Custom equals and hashCode based on ID ---
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Expense expense = (Expense) o;
        return id != null && Objects.equals(id, expense.id);
    }

    @Override
    public int hashCode() {
         return id != null ? Objects.hash(id) : getClass().hashCode();
    }

     @Override
     public String toString() {
         // Avoid deep toString for collections
         return "Expense{" +
                "id=" + id +
                ", description='" + description + '\'' +
                ", amount=" + amount +
                ", date=" + date +
                ", currency='" + currency + '\'' +
                ", createdAt=" + createdAt +
                ", groupId=" + (group != null ? group.getId() : null) +
                ", numberOfPayers=" + (payers != null ? payers.size() : 0) +
                ", numberOfSplits=" + (splits != null ? splits.size() : 0) +
                '}';
     }
}