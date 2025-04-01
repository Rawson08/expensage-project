package com.expensesage.dto;

import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
public class JwtResponse {
    private String token;
    private String type = "Bearer";
    private Long id;
    private String email;
    private String name; // Include basic user info

    public JwtResponse(String accessToken, Long id, String email, String name) {
        this.token = accessToken;
        this.id = id;
        this.email = email;
        this.name = name;
    }
}