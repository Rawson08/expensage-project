package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;

import java.time.LocalDateTime;
import java.util.List; // For validation errors

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ErrorResponseDto {
    private LocalDateTime timestamp;
    private int status;
    private String error; // e.g., "Bad Request", "Not Found"
    private String message; // Specific error message
    private String path; // Request path where error occurred
    private List<String> details; // Optional: For validation errors list

    public ErrorResponseDto(HttpStatus httpStatus, String message, String path) {
        this.timestamp = LocalDateTime.now();
        this.status = httpStatus.value();
        this.error = httpStatus.getReasonPhrase();
        this.message = message;
        this.path = path;
    }

    public ErrorResponseDto(HttpStatus httpStatus, String message, String path, List<String> details) {
        this(httpStatus, message, path);
        this.details = details;
    }
}