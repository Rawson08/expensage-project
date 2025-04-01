package com.expensesage.dto;

import java.math.BigDecimal;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PayerResponseDto {
    private UserResponse user; // Details of the user who paid
    private BigDecimal amountPaid;
}