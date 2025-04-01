package com.expensesage.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.expensesage.model.User;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    // Spring Data JPA will automatically implement methods based on naming
    // conventions

    // Find user by email (useful for login and checking duplicates)
    Optional<User> findByEmail(String email);

    // Check if an email already exists
    boolean existsByEmail(String email);

    // You can add more custom query methods here if needed later
    // e.g., findByNameContainingIgnoreCase(String name);

    // Find user by verification token
    Optional<User> findByVerificationToken(String token);

    // Find user by password reset token
    Optional<User> findByPasswordResetToken(String token);

}