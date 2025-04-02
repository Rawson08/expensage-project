package com.expensesage.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents a single suggested payment in a simplified debt settlement plan.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SimplifiedPaymentDto {

    private UserResponse fromUser; // The user who should pay
    private UserResponse toUser;   // The user who should receive payment
    private BigDecimal amount;     // The amount to be paid
    private String currency;       // The currency of the payment

}