package com.expensesage.dto;

import java.time.LocalDateTime;
import java.util.Set;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponseDto {
    private Long id;
    private String name;
    private LocalDateTime createdAt;
    private UserResponse creator; // Added creator field
    private Set<UserResponse> members;
}