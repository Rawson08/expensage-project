package com.expensesage.model;

import java.math.BigDecimal;
import java.time.LocalDate; // Use specific annotations
import java.time.LocalDateTime;
import java.util.Objects;

import org.hibernate.annotations.CreationTimestamp;

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
@Table(name = "payment")
@Getter // Add Getter
@Setter // Add Setter
@NoArgsConstructor
@AllArgsConstructor
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private LocalDate date;

    @Column(nullable = false, length = 3)
    private String currency = "USD";

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_by_user_id", nullable = false)
    private User paidBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "paid_to_user_id", nullable = false)
    private User paidTo;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "group_id")
    private Group group;

    // --- Custom equals and hashCode based on ID ---
     @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Payment payment = (Payment) o;
        return id != null && Objects.equals(id, payment.id);
    }

    @Override
    public int hashCode() {
         return id != null ? Objects.hash(id) : getClass().hashCode();
    }

     // Avoid using Lombok's @ToString with relationships
     @Override
     public String toString() {
         return "Payment{" +
                 "id=" + id +
                 ", amount=" + amount +
                 ", date=" + date +
                 ", currency='" + currency + '\'' +
                 ", createdAt=" + createdAt +
                 ", paidById=" + (paidBy != null ? paidBy.getId() : null) +
                 ", paidToId=" + (paidTo != null ? paidTo.getId() : null) +
                 ", groupId=" + (group != null ? group.getId() : null) +
                 '}';
     }
}