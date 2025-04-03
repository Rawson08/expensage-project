package com.expensesage.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
public class PushSubscriptionRequest {

    @NotBlank(message = "Endpoint is required")
    private String endpoint;

    @NotNull(message = "Keys object is required")
    private Keys keys;

    @Getter
    @Setter
    @NoArgsConstructor
    public static class Keys {
        @NotBlank(message = "p256dh key is required")
        private String p256dh;

        @NotBlank(message = "auth key is required")
        private String auth;
    }
}