package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PaymentResponseDto {
    private Long id;
    private UserResponse paidBy;
    private UserResponse paidTo;
    private BigDecimal amount;
    private String currency;
    private LocalDate date;
    private LocalDateTime createdAt;
    private Long groupId; // Optional group ID
}