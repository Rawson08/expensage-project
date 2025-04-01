package com.expensesage.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data // Includes @Getter, @Setter, @ToString, @EqualsAndHashCode, @RequiredArgsConstructor
public class FriendRequestDto {

    @NotBlank(message = "Recipient email cannot be blank")
    @Email(message = "Invalid email format")
    private String recipientEmail;

}