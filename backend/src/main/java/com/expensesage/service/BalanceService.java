package com.expensesage.service;

import java.util.List;

import com.expensesage.dto.BalanceDto;
import com.expensesage.dto.OverallBalanceSummaryDto; // Added import
import com.expensesage.dto.SimplifiedPaymentDto; // Added
import com.expensesage.model.User;

public interface BalanceService {

    /**
     * Calculates the overall balance summary for the current user.
     *
     * @param currentUser The user whose balances to calculate.
     * @return An OverallBalanceSummaryDto containing total owed to/by the user.
     */
    OverallBalanceSummaryDto getOverallBalanceSummary(User currentUser); // Changed signature

    /**
     * Calculates the balances for the current user relative to other members
     * based *only* on expenses and payments within the specified group.
     *
     * @param currentUser The user requesting the balances.
     * @param groupId The ID of the group.
     * @return A list of BalanceDto objects representing non-zero balances within the group.
     */
    List<BalanceDto> getGroupBalances(User currentUser, Long groupId);

    /**
     * Calculates the specific balance between two users based on all relevant
     * expenses and payments between them.
     * Used primarily for checks like preventing unfriending.
     *
     * @param userA One user.
     * @param userB The other user.
     * @return BalanceDto representing the net amount userA owes userB (negative) or userB owes userA (positive).
     */
    BalanceDto getBalanceBetweenUsers(User userA, User userB);
 
    /**
     * Calculates the minimum set of payments required to settle all debts within a group.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the calculation (must be a member).
     * @return A list of SimplifiedPaymentDto objects representing the suggested payments.
     * @throws RuntimeException if group not found or user is not a member.
     */
    List<SimplifiedPaymentDto> getSimplifiedGroupPayments(Long groupId, User currentUser);
}