package com.expensesage.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.expensesage.model.Comment;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    /**
     * Finds all comments associated with a specific expense, ordered by creation date ascending.
     *
     * @param expenseId The ID of the expense.
     * @return A list of comments for the given expense, ordered by createdAt.
     */
    List<Comment> findByExpenseIdOrderByCreatedAtAsc(Long expenseId);

    // Add other custom query methods if needed, e.g., findByAuthorId
}