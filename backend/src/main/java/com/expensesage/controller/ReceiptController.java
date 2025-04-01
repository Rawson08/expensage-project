package com.expensesage.controller;

import com.expensesage.dto.OcrResultDto;
import com.expensesage.service.ReceiptScanningService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.expensesage.dto.ReceiptResponse; // Added
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;

@RestController
@RequestMapping("/api/receipts") // Changed base path to /api/receipts
public class ReceiptController {

    private static final Logger logger = LoggerFactory.getLogger(ReceiptController.class);

    private final ReceiptScanningService receiptScanningService;

    @Autowired
    public ReceiptController(ReceiptScanningService receiptScanningService) {
        this.receiptScanningService = receiptScanningService;
    }

    // Existing endpoint for basic OCR
    @PostMapping("/scan")
    public ResponseEntity<OcrResultDto> scanReceipt(@RequestParam("file") MultipartFile file) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a file to upload.");
        }

        // Optional: Add checks for file type and size (as before)

        try {
            logger.info("Received file for basic scanning: {}", file.getOriginalFilename());
            OcrResultDto result = receiptScanningService.processReceipt(file);
            return ResponseEntity.ok(result);
        } catch (IOException e) {
             logger.error("IO Error during basic receipt processing", e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing receipt file.", e);
        } catch (RuntimeException e) {
             logger.error("Runtime Error during basic receipt processing", e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to process receipt: " + e.getMessage(), e);
        }
    }

    // New endpoint for OCR + Gemini Parsing
    @PostMapping("/scan-and-parse") // Changed endpoint name
    public ResponseEntity<ReceiptResponse> scanAndParseReceipt(@RequestParam("receipt") MultipartFile receiptFile) { // Changed parameter name
        if (receiptFile.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Please select a receipt file to upload.");
        }

        // Optional: Add file type/size checks here too

        try {
            logger.info("Received file for scanning and parsing: {}", receiptFile.getOriginalFilename());
            // This method will be implemented in ReceiptScanningService next
            ReceiptResponse response = receiptScanningService.scanAndParseReceipt(receiptFile);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            logger.error("IO Error during receipt scanning/parsing", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing receipt file.", e);
        } catch (Exception e) { // Catch broader exceptions for now
            logger.error("Error during receipt scanning/parsing", e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to scan and parse receipt: " + e.getMessage(), e);
        }
    }
}