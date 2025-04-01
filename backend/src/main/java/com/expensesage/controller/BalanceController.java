package com.expensesage.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired; // Added import
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.BalanceDto;
import com.expensesage.dto.OverallBalanceSummaryDto;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.BalanceService;

@RestController
@RequestMapping("/api/balances")
@PreAuthorize("isAuthenticated()")
public class BalanceController {

    private final BalanceService balanceService;
    private final UserRepository userRepository;

    @Autowired
    public BalanceController(BalanceService balanceService, UserRepository userRepository) {
        this.balanceService = balanceService;
        this.userRepository = userRepository;
    }

    // Helper method to get current authenticated user
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user not found in database"));
    }

    /**
     * Gets the overall balance summary for the currently authenticated user.
     */
    @GetMapping("/overall") // Endpoint remains /overall for now
    public ResponseEntity<OverallBalanceSummaryDto> getOverallBalanceSummary() { // Changed return type and method name
        User currentUser = getCurrentUser();
        OverallBalanceSummaryDto summary = balanceService.getOverallBalanceSummary(currentUser); // Calls correct service method
        return ResponseEntity.ok(summary);
    }

    /**
     * Gets the balances for the currently authenticated user within a specific group.
     * Calculated dynamically based on group transactions.
     */
    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<BalanceDto>> getGroupBalances(@PathVariable Long groupId) {
        User currentUser = getCurrentUser();
        try {
            List<BalanceDto> balances = balanceService.getGroupBalances(currentUser, groupId);
            return ResponseEntity.ok(balances);
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
             throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

     /**
     * Gets the specific balance between the current user and another user.
     * Reads from the pre-calculated user_balance table (or calculates dynamically if needed).
     */
     @GetMapping("/user/{otherUserId}")
     public ResponseEntity<BalanceDto> getBalanceWithUser(@PathVariable Long otherUserId) {
         User currentUser = getCurrentUser();
         User otherUser = userRepository.findById(otherUserId)
                 .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Other user not found"));

         BalanceDto balance = balanceService.getBalanceBetweenUsers(currentUser, otherUser);
         return ResponseEntity.ok(balance);
     }
}