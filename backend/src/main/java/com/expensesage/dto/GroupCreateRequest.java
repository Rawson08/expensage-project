package com.expensesage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupCreateRequest {

    @NotBlank(message = "Group name cannot be blank")
    @Size(min = 1, max = 100, message = "Group name must be between 1 and 100 characters")
    private String name;
}