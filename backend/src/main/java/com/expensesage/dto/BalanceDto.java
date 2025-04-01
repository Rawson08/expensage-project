package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

/**
 * Represents the net balance between the current user and another user.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BalanceDto {

    private UserResponse otherUser; // The other user involved in this balance calculation

    /**
     * The net amount from the perspective of the *current* user.
     * Positive value means 'otherUser' owes the current user.
     * Negative value means the current user owes 'otherUser'.
     */
    private BigDecimal netAmount;

    private String currency; // Assuming a single currency context for this balance
}