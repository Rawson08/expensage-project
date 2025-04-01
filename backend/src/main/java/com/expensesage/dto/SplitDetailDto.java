package com.expensesage.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SplitDetailDto {

    @NotNull(message = "User ID for split cannot be null")
    private Long userId; // The ID of the user involved in this split part

    // Value depends on the SplitType:
    // - EXACT: The exact amount this user owes
    // - PERCENTAGE: The percentage this user owes (e.g., 50.0 for 50%)
    // - SHARE: The number of shares this user owes
    // - EQUAL: This value might be ignored, or could be used for validation (e.g.,
    // must be null)
    @Positive(message = "Split value must be positive") // Generally applicable
    private BigDecimal value;
}