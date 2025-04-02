package com.expensesage.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CommentResponseDto {

    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private UserResponse author; // Include author details
    private Long expenseId; // Include the ID of the expense it belongs to

}