package com.expensesage.model;

import java.time.LocalDateTime;
import java.util.HashSet; // Use specific annotations
import java.util.Objects;
import java.util.Set;

import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType; // For equals/hashCode
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.JoinTable;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne; // Added import
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "app_group")
@Getter // Add Getter
@Setter // Add Setter
@NoArgsConstructor
@AllArgsConstructor
public class Group {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @ManyToOne(fetch = FetchType.LAZY) // Add creator relationship
    @JoinColumn(name = "creator_id", nullable = false)
    private User creator;

    // Relationships
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "group_member",
            joinColumns = @JoinColumn(name = "group_id"),
            inverseJoinColumns = @JoinColumn(name = "user_id")
    )
    private Set<User> members = new HashSet<>();

    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private Set<Expense> expenses = new HashSet<>();

    // Optional: Payments associated with this group
    // @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    // private Set<Payment> payments = new HashSet<>();


    // --- Custom equals and hashCode based on ID ---
     @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        Group group = (Group) o;
        return id != null && Objects.equals(id, group.id);
    }

    @Override
    public int hashCode() {
         return id != null ? Objects.hash(id) : getClass().hashCode();
    }

     // Avoid using Lombok's @ToString with relationships
     @Override
     public String toString() {
         return "Group{" +
                 "id=" + id +
                 ", name='" + name + '\'' +
                 ", createdAt=" + createdAt +
                 ", numberOfMembers=" + (members != null ? members.size() : 0) + // Avoid deep toString
                 ", numberOfExpenses=" + (expenses != null ? expenses.size() : 0) + // Avoid deep toString
                 '}';
     }

     // Helper methods for managing members (optional but good practice)
     public void addMember(User user) {
         this.members.add(user);
         // If User side had a 'groups' collection: user.getGroups().add(this);
     }

     public void removeMember(User user) {
         this.members.remove(user);
         // If User side had a 'groups' collection: user.getGroups().remove(this);
     }
}