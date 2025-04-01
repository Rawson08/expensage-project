package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SplitResponseDto {
    private Long splitId;
    private UserResponse owedBy; // User who owes this amount
    private BigDecimal amountOwed;
}