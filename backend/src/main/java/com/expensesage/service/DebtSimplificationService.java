package com.expensesage.service;

import java.util.List;
import java.util.Map;
import java.util.Set;

import com.expensesage.dto.SimplifiedPaymentDto;
import com.expensesage.model.User;

public interface DebtSimplificationService {

    /**
     * Calculates the minimum set of payments required to settle debts among a group of users.
     * This typically applies within a specific group context or overall between friends.
     *
     * @param users The set of users involved in the debt settlement.
     * @param balances A map where the key is the User and the value is their net balance
     *                 (positive means they are owed, negative means they owe). The sum of all
     *                 balances in the map should be zero (or very close to it).
     * @param currency The currency for the payments.
     * @return A list of SimplifiedPaymentDto objects representing the suggested payments.
     */
    List<SimplifiedPaymentDto> simplifyDebts(Set<User> users, Map<User, Double> balances, String currency);
     // Using Double for balance map here for simplicity in the algorithm, but BigDecimal is safer.
     // We might need to adjust the input or convert internally.

     /**
     * Calculates simplified debts specifically within a given group.
     * It first calculates the net balance of each member within the group context
     * and then applies the simplification algorithm.
     *
     * @param groupId The ID of the group.
     * @param currentUser The user requesting the simplification (must be a member).
     * @return A list of SimplifiedPaymentDto objects for the group.
     */
     List<SimplifiedPaymentDto> simplifyGroupDebts(Long groupId, User currentUser);

}