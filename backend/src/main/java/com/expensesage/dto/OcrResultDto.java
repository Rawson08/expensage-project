package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * Represents potential data extracted from a receipt via OCR.
 * Fields are optional as OCR might not reliably find everything.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class OcrResultDto {
    private BigDecimal totalAmount; // Extracted total amount
    private LocalDate date;         // Extracted date
    private String vendorName;      // Extracted vendor/store name
    private String currency;        // Extracted currency (if possible)
    private List<String> lines;     // Raw lines of text from OCR for context/debugging
    private String fullText;        // Full concatenated text from OCR
}