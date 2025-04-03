package com.expensesage.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SimplifiedPaymentDto {
    private UserResponse fromUser; // User who should pay
    private UserResponse toUser;   // User who should receive
    private BigDecimal amount;   // Amount to pay
    private String currency;
}