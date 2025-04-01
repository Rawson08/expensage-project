package com.expensesage.repository;

import com.expensesage.model.Friendship;
import com.expensesage.model.User;
import com.expensesage.model.Friendship.FriendshipStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    // Find a friendship between two users, regardless of who is user1 or user2
    @Query("SELECT f FROM Friendship f WHERE (f.user1 = :userA AND f.user2 = :userB) OR (f.user1 = :userB AND f.user2 = :userA)")
    Optional<Friendship> findFriendshipBetweenUsers(@Param("userA") User userA, @Param("userB") User userB);

    // Find all friendships for a user where the status is ACCEPTED
    @Query("SELECT f FROM Friendship f WHERE (f.user1 = :user OR f.user2 = :user) AND f.status = :status")
    List<Friendship> findByUserAndStatus(@Param("user") User user, @Param("status") FriendshipStatus status);

    // Find pending friendship requests received by a user
    List<Friendship> findByUser2AndStatus(User user2, FriendshipStatus status);

    // Find pending friendship requests sent by a user
    List<Friendship> findByUser1AndStatus(User user1, FriendshipStatus status);

}