package com.expensesage.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.expensesage.model.Balance;
import com.expensesage.model.User;

@Repository
public interface BalanceRepository extends JpaRepository<Balance, Long> {

    /**
     * Finds the balance record between two users, ensuring user1 always has the lower ID.
     * This query handles the order automatically.
     *
     * @param userA One user in the pair.
     * @param userB The other user in the pair.
     * @return An Optional containing the Balance record if it exists.
     */
    @Query("SELECT b FROM Balance b WHERE (b.user1 = :userA AND b.user2 = :userB) OR (b.user1 = :userB AND b.user2 = :userA)")
    Optional<Balance> findBalanceBetweenUsers(@Param("userA") User userA, @Param("userB") User userB);

    /**
     * Finds all balance records involving a specific user (where they are either user1 or user2).
     *
     * @param user The user whose balances to find.
     * @return A list of Balance records involving the user.
     */
    @Query("SELECT b FROM Balance b WHERE b.user1 = :user OR b.user2 = :user")
    List<Balance> findBalancesInvolvingUser(@Param("user") User user);

}