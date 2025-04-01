package com.expensesage.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TransactionDto {
    private Long id; // Original Expense or Payment ID
    private String type; // "expense" or "payment"
    private String description; // Expense description or generated payment description
    private BigDecimal amount;
    private String currency;
    private LocalDate date;
    private LocalDateTime createdAt; // For sorting

    // Expense specific details (optional)
    private List<PayerResponseDto> payers;
    private List<SplitResponseDto> splits;
    private String notes;
    private String receiptUrl; // Added receipt URL

    // Payment specific details (optional)
    private UserResponse paidBy;
    private UserResponse paidTo;
}