package com.expensesage.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.expensesage.model.SplitType;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseCreateRequest {

    @NotBlank(message = "Description cannot be blank")
    @Size(max = 255, message = "Description cannot exceed 255 characters")
    private String description;

    @NotNull(message = "Amount cannot be null")
    @Positive(message = "Amount must be positive")
    @Digits(integer=8, fraction=2, message = "Amount format is invalid (max 8 integer, 2 fraction digits)")
    private BigDecimal amount;

    @NotNull(message = "Date cannot be null")
    private LocalDate date;

    @Size(min = 3, max = 3, message = "Currency code must be 3 letters")
    private String currency = "USD"; // Default currency

    // Optional: ID of the group this expense belongs to
    private Long groupId;

    // Payer details - replaces implicit payer assumption
    @NotEmpty(message = "Payer details cannot be empty")
    @Valid // Ensure nested validation of PayerDetailDto objects
    private List<PayerDetailDto> payers;

    @NotNull(message = "Split type cannot be null")
    private SplitType splitType;

    @NotEmpty(message = "Split details cannot be empty")
    @Valid // Ensure nested validation of SplitDetailDto objects
    private List<SplitDetailDto> splits;

    @Size(max = 500, message = "Notes cannot exceed 500 characters")
    private String notes; // Optional notes field

}