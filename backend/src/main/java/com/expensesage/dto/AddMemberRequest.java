package com.expensesage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AddMemberRequest {

    @NotBlank(message = "Member email cannot be blank")
    @Email(message = "Invalid email format for member")
    private String memberEmail;

    // Removed memberName as it's only needed for friend requests now



}