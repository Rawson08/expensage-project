package com.expensesage.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.BalanceDto; // If fetching data
import com.expensesage.dto.SimplifiedPaymentDto;
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.User;
import com.expensesage.service.BalanceService;
import com.expensesage.service.DebtSimplificationService;
import com.expensesage.service.GroupService;

@Service
public class DebtSimplificationServiceImpl implements DebtSimplificationService {

    private final BalanceService balanceService;
    private final GroupService groupService;
    private final UserMapper userMapper;

    // Small tolerance for floating point comparisons
    private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.005");
    private static final int SCALE = 2; // Monetary scale

    @Autowired
    public DebtSimplificationServiceImpl(BalanceService balanceService, GroupService groupService, UserMapper userMapper) {
        this.balanceService = balanceService;
        this.groupService = groupService;
        this.userMapper = userMapper;
    }

    @Override
    @Transactional(readOnly = true) // Read-only as it calculates based on existing balances
    public List<SimplifiedPaymentDto> simplifyGroupDebts(Long groupId, User currentUser) {
        // 1. Get group members
        Set<User> members = groupService.getGroupMembers(groupId, currentUser);

        // 2. Calculate net balance for each member within the group
        Map<User, BigDecimal> balances = new HashMap<>();
        for (User member : members) {
            // Calculate balance relative to currentUser first (as BalanceService provides this)
            // We need the absolute balance of each member within the group
            // Let's recalculate group balances from the perspective of the group itself.
            // This requires iterating through all group expenses and payments.
            // Alternatively, we can derive it from pairwise balances, but that's less direct.
            // --> Reusing getGroupBalances logic from BalanceServiceImpl might be better placed here or in a shared utility.
            // For now, let's assume we get the correct net balances for each member.
            // We'll use a placeholder calculation based on pairwise balances relative to currentUser.
             if (!member.equals(currentUser)) {
                 BalanceDto balanceDto = balanceService.getBalanceBetweenUsers(member, currentUser); // Balance from member's perspective
                 balances.put(member, balanceDto.getNetAmount().negate()); // Store balance from currentUser's perspective
             } else {
                 // Calculate currentUser's balance by summing others' balances and negating
                 BigDecimal currentUserBalance = BigDecimal.ZERO;
                 List<BalanceDto> otherBalances = balanceService.getGroupBalances(currentUser, groupId);
                 for(BalanceDto b : otherBalances) {
                     currentUserBalance = currentUserBalance.add(b.getNetAmount());
                 }
                 balances.put(currentUser, currentUserBalance);
             }
             // TODO: This balance calculation needs refinement to be truly accurate for the group overall.
             // A better approach calculates each person's total paid vs total owed within the group.
        }

         // Convert the potentially Double map from interface to BigDecimal map
         Map<User, Double> balancesDouble = balances.entrySet().stream()
                 .collect(Collectors.toMap(Map.Entry::getKey, e -> e.getValue().doubleValue()));


        // 3. Simplify using the core algorithm
        // Assuming default currency for now
        String currency = "USD"; // Fetch from group settings if multi-currency later
        return simplifyDebts(members, balancesDouble, currency);
    }


    @Override
    public List<SimplifiedPaymentDto> simplifyDebts(Set<User> users, Map<User, Double> balancesDouble, String currency) {

        // Convert Double map to BigDecimal map for safe calculations
        Map<User, BigDecimal> balances = balancesDouble.entrySet().stream()
                .collect(Collectors.toMap(Map.Entry::getKey, e -> BigDecimal.valueOf(e.getValue()).setScale(SCALE, RoundingMode.HALF_UP)));


        List<SimplifiedPaymentDto> payments = new ArrayList<>();

        // Use two lists/maps: one for debtors (negative balance) and one for creditors (positive balance)
        Map<User, BigDecimal> debtors = new HashMap<>();
        Map<User, BigDecimal> creditors = new HashMap<>();

        for (Map.Entry<User, BigDecimal> entry : balances.entrySet()) {
            BigDecimal balance = entry.getValue();
            if (balance.compareTo(ZERO_THRESHOLD) < 0) { // User owes money (debtor)
                debtors.put(entry.getKey(), balance.negate()); // Store amount owed as positive
            } else if (balance.compareTo(ZERO_THRESHOLD) > 0) { // User is owed money (creditor)
                creditors.put(entry.getKey(), balance);
            }
            // Ignore users with zero balance
        }

        // While there are still debtors and creditors
        while (!debtors.isEmpty() && !creditors.isEmpty()) {
            // Find max debtor and max creditor (can simply take the first one for simplicity here)
            // A more optimal approach might sort or use priority queues
            Map.Entry<User, BigDecimal> maxDebtorEntry = debtors.entrySet().iterator().next();
            Map.Entry<User, BigDecimal> maxCreditorEntry = creditors.entrySet().iterator().next();

            User debtor = maxDebtorEntry.getKey();
            User creditor = maxCreditorEntry.getKey();
            BigDecimal amountOwed = maxDebtorEntry.getValue();
            BigDecimal amountDue = maxCreditorEntry.getValue();

            // Determine the amount to transfer
            BigDecimal transferAmount = amountOwed.min(amountDue);

            // Record the simplified payment
            payments.add(new SimplifiedPaymentDto(
                    userMapper.toUserResponse(debtor),
                    userMapper.toUserResponse(creditor),
                    transferAmount,
                    currency
            ));

            // Update balances
            debtors.put(debtor, amountOwed.subtract(transferAmount));
            creditors.put(creditor, amountDue.subtract(transferAmount));

            // Remove users whose balances become zero (or close enough)
            if (debtors.get(debtor).compareTo(ZERO_THRESHOLD) < 0) {
                debtors.remove(debtor);
            }
             if (creditors.get(creditor).compareTo(ZERO_THRESHOLD) < 0) {
                creditors.remove(creditor);
            }
        }

        // Any remaining small balances in debtors/creditors might indicate rounding issues
        // or could be ignored if below the threshold.

        return payments;
    }
}