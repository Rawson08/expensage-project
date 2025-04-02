package com.expensesage.service.impl;

import java.util.List;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.CommentCreateRequest;
import com.expensesage.dto.CommentResponseDto;
import com.expensesage.mapper.CommentMapper;
import com.expensesage.model.Comment;
import com.expensesage.model.Expense;
import com.expensesage.model.User;
import com.expensesage.repository.CommentRepository;
import com.expensesage.repository.ExpenseRepository;
import com.expensesage.service.CommentService;

import jakarta.persistence.EntityNotFoundException;

@Service
public class CommentServiceImpl implements CommentService {

    private static final Logger logger = LoggerFactory.getLogger(CommentServiceImpl.class);

    private final CommentRepository commentRepository;
    private final ExpenseRepository expenseRepository;
    private final CommentMapper commentMapper;

    @Autowired
    public CommentServiceImpl(CommentRepository commentRepository, ExpenseRepository expenseRepository, CommentMapper commentMapper) {
        this.commentRepository = commentRepository;
        this.expenseRepository = expenseRepository;
        this.commentMapper = commentMapper;
    }

    // Helper method to check if user is member of the expense's group
    private void checkUserMembership(Expense expense, User user) {
        if (expense.getGroup() != null) {
            // Initialize members if needed (might be lazy)
            Hibernate.initialize(expense.getGroup().getMembers()); 
            if (!expense.getGroup().getMembers().contains(user)) {
                throw new AccessDeniedException("User is not a member of the group associated with this expense.");
            }
        } 
        // If expense is not part of a group (e.g., direct friend expense), 
        // we might need different authorization logic here, e.g., check if user is payer or owed.
        // For now, we assume comments are primarily for group expenses.
        // If expense.getGroup() is null, maybe allow if user is involved? Needs clarification.
        else {
             logger.warn("Attempting to access comments for non-group expense ID: {}. Authorization logic might be needed.", expense.getId());
             // For simplicity, let's deny if not in a group for now. Adjust if needed.
             // throw new AccessDeniedException("Comments are currently only supported for group expenses.");
             
             // Alternative: Check if user is payer or owed
             Hibernate.initialize(expense.getPayers());
             Hibernate.initialize(expense.getSplits());
             boolean isPayer = expense.getPayers().stream().anyMatch(p -> p.getUser().equals(user));
             boolean isOwed = expense.getSplits().stream().anyMatch(s -> s.getOwedBy().equals(user));
             if (!isPayer && !isOwed) {
                 throw new AccessDeniedException("User is not involved in this non-group expense.");
             }
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<CommentResponseDto> getCommentsForExpense(Long expenseId, User currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found with ID: " + expenseId));

        checkUserMembership(expense, currentUser); // Check authorization

        List<Comment> comments = commentRepository.findByExpenseIdOrderByCreatedAtAsc(expenseId);
        // Eager fetch authors before mapping
        comments.forEach(comment -> Hibernate.initialize(comment.getAuthor())); 
        logger.info("Fetched {} comments for expense ID: {}", comments.size(), expenseId);
        return commentMapper.toCommentResponseDtoList(comments);
    }

    @Override
    @Transactional
    public CommentResponseDto addCommentToExpense(Long expenseId, CommentCreateRequest commentRequest, User currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new EntityNotFoundException("Expense not found with ID: " + expenseId));

        checkUserMembership(expense, currentUser); // Check authorization

        Comment newComment = Comment.builder()
                .content(commentRequest.getContent())
                .author(currentUser)
                .expense(expense)
                .build();
        // createdAt is set by @PrePersist

        Comment savedComment = commentRepository.save(newComment);
        logger.info("User {} added comment ID: {} to expense ID: {}", currentUser.getEmail(), savedComment.getId(), expenseId);
        // Need to fetch author for the response DTO
        Hibernate.initialize(savedComment.getAuthor()); 
        return commentMapper.toCommentResponseDto(savedComment);
    }

    @Override
    @Transactional
    public void deleteComment(Long commentId, User currentUser) {
        Comment comment = commentRepository.findById(commentId)
                .orElseThrow(() -> new EntityNotFoundException("Comment not found with ID: " + commentId));

        // Authorization: Only the author can delete their comment
        Hibernate.initialize(comment.getAuthor()); // Ensure author is loaded
        if (!comment.getAuthor().equals(currentUser)) {
            logger.warn("User {} attempted to delete comment ID: {} owned by user {}", currentUser.getEmail(), commentId, comment.getAuthor().getEmail());
            throw new AccessDeniedException("You are not authorized to delete this comment.");
        }

        logger.info("User {} deleting comment ID: {}", currentUser.getEmail(), commentId);
        commentRepository.delete(comment);
    }
}