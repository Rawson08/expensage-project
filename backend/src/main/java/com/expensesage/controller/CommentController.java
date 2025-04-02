package com.expensesage.controller;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.CommentCreateRequest;
import com.expensesage.dto.CommentResponseDto;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.CommentService;

import jakarta.persistence.EntityNotFoundException;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api") // Base path for comment-related endpoints
@PreAuthorize("isAuthenticated()") // All comment actions require authentication
public class CommentController {

    private static final Logger logger = LoggerFactory.getLogger(CommentController.class);

    private final CommentService commentService;
    private final UserRepository userRepository;

    @Autowired
    public CommentController(CommentService commentService, UserRepository userRepository) {
        this.commentService = commentService;
        this.userRepository = userRepository;
    }

    // Helper method to get the currently authenticated User entity
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Current user not found in database"));
    }

    // --- Endpoints ---

    // GET comments for a specific expense
    @GetMapping("/expenses/{expenseId}/comments")
    public ResponseEntity<List<CommentResponseDto>> getCommentsByExpense(@PathVariable Long expenseId) {
        try {
            User currentUser = getCurrentUser();
            List<CommentResponseDto> comments = commentService.getCommentsForExpense(expenseId, currentUser);
            return ResponseEntity.ok(comments);
        } catch (EntityNotFoundException e) {
            logger.warn("Attempted to get comments for non-existent expense ID: {}", expenseId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("Access denied for user {} trying to get comments for expense ID: {}", getCurrentUser().getEmail(), expenseId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (Exception e) {
            logger.error("Error fetching comments for expense ID: {}", expenseId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // POST a new comment to an expense
    @PostMapping("/expenses/{expenseId}/comments")
    public ResponseEntity<CommentResponseDto> addComment(@PathVariable Long expenseId, @Valid @RequestBody CommentCreateRequest commentRequest) {
        try {
            User currentUser = getCurrentUser();
            CommentResponseDto newComment = commentService.addCommentToExpense(expenseId, commentRequest, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(newComment);
        } catch (EntityNotFoundException e) {
            logger.warn("Attempted to add comment to non-existent expense ID: {}", expenseId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("Access denied for user {} trying to add comment to expense ID: {}", getCurrentUser().getEmail(), expenseId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (Exception e) {
            logger.error("Error adding comment to expense ID: {}", expenseId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }

    // DELETE a comment by its ID
    @DeleteMapping("/comments/{commentId}")
    public ResponseEntity<Void> deleteComment(@PathVariable Long commentId) {
        try {
            User currentUser = getCurrentUser();
            commentService.deleteComment(commentId, currentUser);
            return ResponseEntity.noContent().build(); // 204 No Content on successful deletion
        } catch (EntityNotFoundException e) {
            logger.warn("Attempted to delete non-existent comment ID: {}", commentId);
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        } catch (AccessDeniedException e) {
            logger.warn("Access denied for user {} trying to delete comment ID: {}", getCurrentUser().getEmail(), commentId);
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (Exception e) {
            logger.error("Error deleting comment ID: {}", commentId, e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred");
        }
    }
}