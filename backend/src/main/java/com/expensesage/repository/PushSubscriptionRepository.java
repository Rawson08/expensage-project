package com.expensesage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.expensesage.model.PushSubscription;
import com.expensesage.model.User;

@Repository
public interface PushSubscriptionRepository extends JpaRepository<PushSubscription, Long> {

    // Find all subscriptions for a given user
    List<PushSubscription> findByUser(User user);

    // Find a subscription by its unique endpoint URL
    Optional<PushSubscription> findByEndpoint(String endpoint);

    // Delete a subscription by its endpoint URL (useful for unsubscribing)
    void deleteByEndpoint(String endpoint);
}