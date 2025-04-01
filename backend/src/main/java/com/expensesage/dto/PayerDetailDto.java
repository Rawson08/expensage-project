package com.expensesage.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayerDetailDto {

    @NotNull(message = "User ID for payer cannot be null")
    private Long userId; // The ID of the user who paid this portion

    @NotNull(message = "Amount paid cannot be null")
    @Positive(message = "Amount paid must be positive")
    private BigDecimal amountPaid; // The amount this user paid
}