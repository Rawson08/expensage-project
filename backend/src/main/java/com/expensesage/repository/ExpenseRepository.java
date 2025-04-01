package com.expensesage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.expensesage.model.Expense;
import com.expensesage.model.Group;

@Repository
public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Removed findByPaidBy(User paidBy); - Use ExpensePayerRepository instead

    // Find expenses belonging to a specific group
    List<Expense> findByGroup(Group group);

    // Removed findByGroupAndPaidBy(Group group, User paidBy); - Use ExpensePayerRepository instead

    // Find expenses where a user is involved either as payer or via a split
    // This might require a more complex query or service-level logic
    // involving the SplitRepository.

}