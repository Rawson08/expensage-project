package com.expensesage.model;

import java.math.BigDecimal;
import java.util.Objects; // Use specific annotations

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType; // For equals/hashCode
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "expense_split")
@Getter // Add Getter
@Setter // Add Setter
@NoArgsConstructor
@AllArgsConstructor
public class Split {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amountOwed;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "expense_id", nullable = false)
    private Expense expense;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owed_by_user_id", nullable = false)
    private User owedBy;

    // --- Custom equals and hashCode based on ID ---
     @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Split split = (Split) o;
        return id != null && Objects.equals(id, split.id);
    }

    @Override
    public int hashCode() {
        return id != null ? Objects.hash(id) : super.hashCode();
        // Or: return getClass().hashCode(); // If ID can be null before saving
    }

     // Avoid using Lombok's @ToString with bidirectional relationships
     @Override
     public String toString() {
         return "Split{" +
                 "id=" + id +
                 ", amountOwed=" + amountOwed +
                 ", expenseId=" + (expense != null ? expense.getId() : null) + // Avoid deep toString
                 ", owedById=" + (owedBy != null ? owedBy.getId() : null) + // Avoid deep toString
                 '}';
     }
}