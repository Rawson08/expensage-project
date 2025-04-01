package com.expensesage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import com.expensesage.model.SplitType; // Added import

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponseDto {
    private Long id;
    private String description;
    private BigDecimal amount;
    private String currency;
    private LocalDate date;
    private LocalDateTime createdAt;
    private List<PayerResponseDto> payers;
    private Long groupId;
    private SplitType splitType;
    private List<SplitResponseDto> splits;
    private String notes;
    private String receiptUrl; // Added receipt URL field
}