package com.expensesage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying; // Added import
import org.springframework.data.jpa.repository.Query; // Added import
import org.springframework.data.repository.query.Param; // Added import
import org.springframework.stereotype.Repository;

import com.expensesage.model.Expense;
import com.expensesage.model.ExpensePayer;
import com.expensesage.model.User;

@Repository
public interface ExpensePayerRepository extends JpaRepository<ExpensePayer, Long> {

    List<ExpensePayer> findByExpense(Expense expense);

    List<ExpensePayer> findByUser(User user);

    // Add more specific queries if needed

    @Modifying // Indicates a query that modifies data (DELETE)
    @Query("DELETE FROM ExpensePayer ep WHERE ep.expense.id = :expenseId")
    void deleteByExpenseId(@Param("expenseId") Long expenseId);
}