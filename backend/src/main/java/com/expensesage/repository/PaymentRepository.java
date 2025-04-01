package com.expensesage.repository;

import com.expensesage.model.Group;
import com.expensesage.model.Payment;
import com.expensesage.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    // Find payments made by a specific user
    List<Payment> findByPaidBy(User paidBy);

    // Find payments received by a specific user
    List<Payment> findByPaidTo(User paidTo);

    // Find payments related to a specific group (if group is not null)
    List<Payment> findByGroup(Group group);

    // Find payments between two specific users (either direction)
    @Query("SELECT p FROM Payment p WHERE (p.paidBy = :userA AND p.paidTo = :userB) OR (p.paidBy = :userB AND p.paidTo = :userA)")
    List<Payment> findPaymentsBetweenUsers(@Param("userA") User userA, @Param("userB") User userB);

    // Find payments within a group between two specific users
    @Query("SELECT p FROM Payment p WHERE p.group = :group AND ((p.paidBy = :userA AND p.paidTo = :userB) OR (p.paidBy = :userB AND p.paidTo = :userA))")
    List<Payment> findPaymentsBetweenUsersInGroup(@Param("group") Group group, @Param("userA") User userA,
            @Param("userB") User userB);

    // Find payments made by a specific user to another specific user
    List<Payment> findByPaidByAndPaidTo(User paidBy, User paidTo);

    // Find payments within a group made by a specific user
    List<Payment> findByGroupAndPaidBy(Group group, User paidBy);

    // Find payments within a group received by a specific user
    List<Payment> findByGroupAndPaidTo(Group group, User paidTo);
}