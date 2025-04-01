package com.expensesage.model;

import java.time.LocalDateTime;
import java.util.Objects; // Use specific annotations

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType; // For equals/hashCode
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "friendship", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"user1_id", "user2_id"})
})
@Getter // Add Getter
@Setter // Add Setter
@NoArgsConstructor
@AllArgsConstructor
public class Friendship {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user1_id", nullable = false)
    private User user1;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user2_id", nullable = false)
    private User user2;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private FriendshipStatus status;

    // ID of the user who initiated the PENDING request (user1 or user2)
    // Null if status is ACCEPTED or REJECTED
    @Column(name = "action_user_id")
    private Long actionUserId;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public enum FriendshipStatus {
        PENDING,
        ACCEPTED,
        REJECTED,
        BLOCKED
    }

    // --- Custom equals and hashCode based on ID ---
     @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Friendship that = (Friendship) o;
        return id != null && Objects.equals(id, that.id);
    }

    @Override
    public int hashCode() {
         return id != null ? Objects.hash(id) : getClass().hashCode();
    }

     // Avoid using Lombok's @ToString with relationships
     @Override
     public String toString() {
         return "Friendship{" +
                 "id=" + id +
                 ", user1Id=" + (user1 != null ? user1.getId() : null) +
                 ", user2Id=" + (user2 != null ? user2.getId() : null) +
                 ", status=" + status +
                 ", createdAt=" + createdAt +
                 '}';
     }

    // PrePersist/PreUpdate logic could be added here if needed.
}