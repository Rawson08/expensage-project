package com.expensesage.service;

import java.util.List;

import com.expensesage.dto.CommentCreateRequest;
import com.expensesage.dto.CommentResponseDto;
import com.expensesage.model.User;

public interface CommentService {

    /**
     * Retrieves all comments for a specific expense, ordered by creation time.
     * Ensures the requesting user is a member of the expense's group.
     *
     * @param expenseId   The ID of the expense.
     * @param currentUser The user requesting the comments.
     * @return A list of CommentResponseDto objects.
     * @throws RuntimeException if expense not found or user is not authorized.
     */
    List<CommentResponseDto> getCommentsForExpense(Long expenseId, User currentUser);

    /**
     * Adds a new comment to an expense.
     * Ensures the requesting user is a member of the expense's group.
     *
     * @param expenseId      The ID of the expense to comment on.
     * @param commentRequest The DTO containing the comment content.
     * @param currentUser    The user adding the comment.
     * @return The created CommentResponseDto.
     * @throws RuntimeException if expense not found or user is not authorized.
     */
    CommentResponseDto addCommentToExpense(Long expenseId, CommentCreateRequest commentRequest, User currentUser);

    /**
     * Deletes a comment.
     * Ensures the requesting user is the author of the comment.
     *
     * @param commentId   The ID of the comment to delete.
     * @param currentUser The user attempting to delete the comment.
     * @throws RuntimeException if comment not found or user is not the author.
     */
    void deleteComment(Long commentId, User currentUser);

}