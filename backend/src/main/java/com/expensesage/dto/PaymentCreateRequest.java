package com.expensesage.dto;

import jakarta.validation.constraints.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentCreateRequest {

    @NotNull(message = "Recipient user ID cannot be null")
    private Long paidToUserId; // The ID of the user receiving the payment

    @NotNull(message = "Amount cannot be null")
    @Positive(message = "Amount must be positive")
    @Digits(integer = 8, fraction = 2, message = "Amount format is invalid")
    private BigDecimal amount;

    @NotNull(message = "Date cannot be null")
    private LocalDate date;

    @Size(min = 3, max = 3, message = "Currency code must be 3 letters")
    private String currency = "USD"; // Default currency

    // Optional: ID of the group this payment relates to (e.g., settling group
    // debts)
    private Long groupId;

    // Payer ID is implicitly the currently authenticated user
}