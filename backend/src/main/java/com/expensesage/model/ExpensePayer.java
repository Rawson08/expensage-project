package com.expensesage.model;

import java.math.BigDecimal;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "expense_payer")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ExpensePayer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user; // The user who paid this portion

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amountPaid; // The amount this user paid

    // --- Custom equals and hashCode based on ID ---
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ExpensePayer that = (ExpensePayer) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
         return id != null ? Objects.hash(id) : getClass().hashCode();
    }

    @Override
    public String toString() {
        return "ExpensePayer{" +
                "id=" + id +
                ", expenseId=" + (expense != null ? expense.getId() : null) +
                ", userId=" + (user != null ? user.getId() : null) +
                ", amountPaid=" + amountPaid +
                '}';
    }
}