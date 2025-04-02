package com.expensesage.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class GroupSettingsUpdateRequest {

    @NotNull(message = "Simplify debts setting must be provided (true or false)")
    private Boolean simplifyDebts;

}