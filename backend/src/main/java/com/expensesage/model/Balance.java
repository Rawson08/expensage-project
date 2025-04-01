package com.expensesage.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.Objects;

@Entity
@Table(name = "user_balance", uniqueConstraints = {
    // Ensure only one balance record exists per unique pair of users
    @UniqueConstraint(columnNames = {"user1_id", "user2_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Balance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1; // User with the lower ID

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2; // User with the higher ID

    /**
     * Net amount user1 owes user2.
     * Positive: user1 owes user2.
     * Negative: user2 owes user1.
     */
    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    private String currency = "USD"; // Assuming a single currency for simplicity for now

    // --- Custom equals and hashCode based on user pair ---
    // Important for managing balances correctly in collections/maps if needed

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Balance balance = (Balance) o;
        // Check equality based on the user pair, regardless of order in user1/user2
        return (Objects.equals(user1, balance.user1) && Objects.equals(user2, balance.user2)) ||
               (Objects.equals(user1, balance.user2) && Objects.equals(user2, balance.user1));
    }

    @Override
    public int hashCode() {
        // Hash code should be consistent regardless of user1/user2 order
        long id1 = (user1 != null && user1.getId() != null) ? user1.getId() : 0;
        long id2 = (user2 != null && user2.getId() != null) ? user2.getId() : 0;
        // Simple commutative hash: sum of IDs (or XOR)
        return Objects.hash(id1 + id2);
    }

     @Override
     public String toString() {
         return "Balance{" +
                "id=" + id +
                ", user1=" + (user1 != null ? user1.getId() : null) +
                ", user2=" + (user2 != null ? user2.getId() : null) +
                ", amount=" + amount +
                ", currency='" + currency + '\'' +
                '}';
     }
}