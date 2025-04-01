package com.expensesage.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OverallBalanceSummaryDto {
    private BigDecimal totalOwedToUser; // Total amount others owe the current user (positive)
    private BigDecimal totalOwedByUser; // Total amount the current user owes others (positive)
    private String currency;
    // We can add the detailed breakdown back later if needed
    // private List<BalanceDto> breakdown;
}