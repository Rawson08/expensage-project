package com.expensesage.service;

import java.io.IOException;

import org.springframework.web.multipart.MultipartFile;

import com.expensesage.dto.OcrResultDto;
import com.expensesage.dto.ReceiptResponse; // Added

/**
 * Service interface for handling receipt scanning and processing.
 */
public interface ReceiptScanningService {

    /**
     * Processes an uploaded receipt image file using an OCR service (e.g., Google Cloud Vision).
     * Extracts only the raw text from the receipt.
     *
     * @param file The uploaded image file (e.g., JPEG, PNG).
     * @return An OcrResultDto containing the extracted raw text.
     * @throws IOException If there's an error reading the file or communicating with the OCR service.
     * @throws RuntimeException If OCR processing fails for other reasons.
     */
    OcrResultDto processReceipt(MultipartFile file) throws IOException;

    /**
     * Scans an uploaded receipt image file using OCR, parses the result using an AI model (e.g., Gemini),
     * and returns structured receipt data.
     *
     * @param receiptFile The uploaded receipt image file.
     * @return A ReceiptResponse DTO containing the structured data (store name, date, total, items).
     * @throws IOException If there's an error reading the file or communicating with external services.
     * @throws Exception If parsing or other processing fails.
     */
    ReceiptResponse scanAndParseReceipt(MultipartFile receiptFile) throws IOException, Exception; // Added Exception for broader error handling initially

}