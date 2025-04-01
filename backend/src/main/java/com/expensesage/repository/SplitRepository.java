package com.expensesage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying; // Added import
import org.springframework.data.jpa.repository.Query; // Added import
import org.springframework.data.repository.query.Param; // Added import
import org.springframework.stereotype.Repository;

import com.expensesage.model.Expense;
import com.expensesage.model.Split;
import com.expensesage.model.User;

@Repository
public interface SplitRepository extends JpaRepository<Split, Long> {

    // Find splits for a specific expense
    List<Split> findByExpense(Expense expense);

    // Find splits owed by a specific user
    List<Split> findByOwedBy(User owedBy);

    // Find splits for a specific expense owed by a specific user
    List<Split> findByExpenseAndOwedBy(Expense expense, User owedBy);

    @Modifying
    @Query("DELETE FROM Split s WHERE s.expense.id = :expenseId")
    void deleteByExpenseId(@Param("expenseId") Long expenseId);
}