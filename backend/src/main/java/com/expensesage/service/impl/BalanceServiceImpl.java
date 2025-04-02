package com.expensesage.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList; // Added
import java.util.Comparator; // Added
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
 
import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.BalanceDto;
import com.expensesage.dto.OverallBalanceSummaryDto;
import com.expensesage.dto.SimplifiedPaymentDto; // Added
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.Balance;
import com.expensesage.model.Expense;
import com.expensesage.model.Group;
import com.expensesage.model.Payment;
import com.expensesage.model.User;
import com.expensesage.repository.BalanceRepository;
import com.expensesage.repository.ExpensePayerRepository;
import com.expensesage.repository.ExpenseRepository;
import com.expensesage.repository.PaymentRepository;
import com.expensesage.repository.SplitRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.BalanceService;
import com.expensesage.service.GroupService;


@Service
public class BalanceServiceImpl implements BalanceService {

    private static final Logger logger = LoggerFactory.getLogger(BalanceServiceImpl.class);
    private final BalanceRepository balanceRepository;
    private final UserMapper userMapper;
    private final ExpenseRepository expenseRepository;
    private final SplitRepository splitRepository;
    private final PaymentRepository paymentRepository;
    private final ExpensePayerRepository expensePayerRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;


    private static final String DEFAULT_CURRENCY = "USD";
    private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.005");
    private static final int MONETARY_SCALE = 2;


    @Autowired
    public BalanceServiceImpl(BalanceRepository balanceRepository,
                              UserMapper userMapper,
                              ExpenseRepository expenseRepository,
                              SplitRepository splitRepository,
                              PaymentRepository paymentRepository,
                              ExpensePayerRepository expensePayerRepository,
                              UserRepository userRepository,
                              @Lazy GroupService groupService) {
        this.balanceRepository = balanceRepository;
        this.userMapper = userMapper;
        this.expenseRepository = expenseRepository;
        this.splitRepository = splitRepository;
        this.paymentRepository = paymentRepository;
        this.expensePayerRepository = expensePayerRepository;
        this.userRepository = userRepository;
        this.groupService = groupService;
    }

    // getBalanceBetweenUsers - Keep version reading from Balance table for friendship check consistency
    @Override
    @Transactional(readOnly = true)
    public BalanceDto getBalanceBetweenUsers(User userA, User userB) {
         if (userA.equals(userB)) {
             return new BalanceDto(userMapper.toUserResponse(userB), BigDecimal.ZERO.setScale(MONETARY_SCALE, RoundingMode.HALF_UP), DEFAULT_CURRENCY);
        }
        User user1 = userA.getId() < userB.getId() ? userA : userB;
        User user2 = userA.getId() < userB.getId() ? userB : userA;
        Optional<Balance> balanceOpt = balanceRepository.findBalanceBetweenUsers(user1, user2);
        BigDecimal netAmount = BigDecimal.ZERO; // Positive: userB owes userA
        String currency = DEFAULT_CURRENCY;
        if (balanceOpt.isPresent()) {
            Balance balance = balanceOpt.get();
            Hibernate.initialize(balance.getUser1());
            Hibernate.initialize(balance.getUser2());
            currency = balance.getCurrency();
            if (userA.equals(balance.getUser1())) { netAmount = balance.getAmount().negate(); }
            else { netAmount = balance.getAmount(); }
        }
        BigDecimal finalScaledBalance = netAmount.setScale(MONETARY_SCALE, RoundingMode.HALF_UP);
        User otherUserResponseTarget = userA.equals(user1) ? user2 : user1;
        return new BalanceDto(userMapper.toUserResponse(otherUserResponseTarget), finalScaledBalance, currency);
    }


    @Override
    @Transactional(readOnly = true)
    public OverallBalanceSummaryDto getOverallBalanceSummary(User currentUser) {
        logger.info("Calculating overall balance summary for user {}", currentUser.getId());
        Map<User, BigDecimal> netBalances = new HashMap<>(); // Positive: Other User owes currentUser

        // --- Simplified Logic: Aggregate balances from all groups the user is in ---
        // TODO: This needs to be expanded later to include non-group expenses/payments
        List<Group> userGroups = groupService.getGroupsForUser(currentUser);
        logger.debug("User {} is in {} groups. Aggregating group balances.", currentUser.getId(), userGroups.size());

        for (Group group : userGroups) {
            List<BalanceDto> groupBalances = getGroupBalances(currentUser, group.getId()); // Use the working group balance logic
            for (BalanceDto balance : groupBalances) {
                // Find the actual User object for the key, not just UserResponse
                User otherUser = userRepository.findById(balance.getOtherUser().getId())
                    .orElseThrow(() -> new RuntimeException("User not found during balance aggregation: " + balance.getOtherUser().getId()));
                // BalanceDto netAmount is already from currentUser's perspective (positive = other owes current)
                netBalances.merge(otherUser, balance.getNetAmount(), BigDecimal::add);
                 logger.trace("Aggregated balance from group {}: User {} owes User {}: {}. Cumulative: {}",
                              group.getId(), otherUser.getId(), currentUser.getId(), balance.getNetAmount(), netBalances.get(otherUser));
            }
        }

        // --- TODO: Add logic here to process non-group expenses and payments ---
        // Find expenses where group is null and currentUser is involved
        // Find payments where group is null and currentUser is involved
        // Apply similar logic as the group expense/payment processing loops but only for these non-group items

        logger.warn("Overall balance calculation currently ONLY considers group balances.");


        // Calculate Summary Totals from the aggregated pairwise balances
        BigDecimal totalOwedToUser = BigDecimal.ZERO;
        BigDecimal totalOwedByUser = BigDecimal.ZERO;

        for (BigDecimal balance : netBalances.values()) {
            if (balance.compareTo(BigDecimal.ZERO) > 0) {
                totalOwedToUser = totalOwedToUser.add(balance);
            } else {
                totalOwedByUser = totalOwedByUser.add(balance.abs());
            }
        }

        logger.info("Calculated overall balance summary for user {}: OwedToUser={}, OwedByUser={}",
                    currentUser.getId(), totalOwedToUser, totalOwedByUser);

        return new OverallBalanceSummaryDto(
            totalOwedToUser.setScale(MONETARY_SCALE, RoundingMode.HALF_UP),
            totalOwedByUser.setScale(MONETARY_SCALE, RoundingMode.HALF_UP),
            DEFAULT_CURRENCY
        );
    }


    @Override
    @Transactional(readOnly = true)
    public List<BalanceDto> getGroupBalances(User currentUser, Long groupId) {
        // This logic is assumed correct based on user feedback
        logger.info("Calculating group balances for user {} in group {}", currentUser.getId(), groupId);
        Group group = groupService.getGroupById(groupId, currentUser);
        Set<User> members = group.getMembers();
        Map<User, BigDecimal> groupMemberBalances = new HashMap<>(); // Positive: Member owes currentUser

        for(User member : members) {
            if (!member.equals(currentUser)) {
                groupMemberBalances.put(member, BigDecimal.ZERO);
            }
        }

        List<Expense> groupExpenses = expenseRepository.findByGroup(group);
        List<Payment> groupPayments = paymentRepository.findByGroup(group);

        groupExpenses.forEach(exp -> {
            Hibernate.initialize(exp.getPayers());
            exp.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
            Hibernate.initialize(exp.getSplits());
            exp.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
        });
        groupPayments.forEach(p -> {
            Hibernate.initialize(p.getPaidBy());
            Hibernate.initialize(p.getPaidTo());
        });

        // Process expenses within the group
        for (Expense expense : groupExpenses) {
             Map<User, BigDecimal> expenseNetContributions = new HashMap<>();
             expense.getPayers().forEach(p -> expenseNetContributions.merge(p.getUser(), p.getAmountPaid(), BigDecimal::add));
             expense.getSplits().forEach(s -> expenseNetContributions.merge(s.getOwedBy(), s.getAmountOwed().negate(), BigDecimal::add));

             BigDecimal currentUserNet = expenseNetContributions.getOrDefault(currentUser, BigDecimal.ZERO);
             for (User member : members) {
                 if (member.equals(currentUser)) continue;
                 BigDecimal memberNet = expenseNetContributions.getOrDefault(member, BigDecimal.ZERO);
                 BigDecimal transferAmount = BigDecimal.ZERO; // Positive: currentUser owes member
                 if (currentUserNet.compareTo(BigDecimal.ZERO) < 0 && memberNet.compareTo(BigDecimal.ZERO) > 0) {
                     transferAmount = currentUserNet.abs().min(memberNet);
                 } else if (currentUserNet.compareTo(BigDecimal.ZERO) > 0 && memberNet.compareTo(BigDecimal.ZERO) < 0) {
                     transferAmount = currentUserNet.min(memberNet.abs()).negate();
                 }
                 if (transferAmount.compareTo(BigDecimal.ZERO) != 0) {
                     groupMemberBalances.merge(member, transferAmount.negate(), BigDecimal::add);
                 }
             }
        }

        // Process payments within the group (Using the user-confirmed correct logic)
        for (Payment payment : groupPayments) {
            User paidBy = payment.getPaidBy();
            User paidTo = payment.getPaidTo();
            if (paidBy.equals(currentUser) && groupMemberBalances.containsKey(paidTo)) {
                // CurrentUser paid Member: Increases what Member owes CurrentUser
                groupMemberBalances.merge(paidTo, payment.getAmount(), BigDecimal::add);
            } else if (paidTo.equals(currentUser) && groupMemberBalances.containsKey(paidBy)) {
                // Member paid CurrentUser: Reduces what Member owes CurrentUser
                 groupMemberBalances.merge(paidBy, payment.getAmount().negate(), BigDecimal::add);
            }
        }

        // Convert map to list of BalanceDto
        List<BalanceDto> finalGroupBalances = groupMemberBalances.entrySet().stream()
                .filter(entry -> entry.getValue().abs().compareTo(ZERO_THRESHOLD) > 0)
                .map(entry -> new BalanceDto(
                        userMapper.toUserResponse(entry.getKey()),
                        entry.getValue().setScale(MONETARY_SCALE, RoundingMode.HALF_UP),
                        DEFAULT_CURRENCY))
                .collect(Collectors.toList());
        logger.info("Calculated {} non-zero group balances for user {} in group {}", finalGroupBalances.size(), currentUser.getId(), groupId);
        return finalGroupBalances;
    }

    // Removed calculatePairwiseBalanceDynamically helper
    // updateBalancesForExpense and updateBalancesForPayment are removed
 
    // --- Debt Simplification Logic ---
 
    /**
     * Calculates the net balance for each member within a group.
     * Positive means the member is owed money overall within the group.
     * Negative means the member owes money overall within the group.
     *
     * @param group The group entity.
     * @return A map where keys are User entities and values are their net balances.
     */
    private Map<User, BigDecimal> calculateGroupNetBalances(Group group) {
        Set<User> members = group.getMembers();
        Map<User, BigDecimal> netBalances = new HashMap<>();
        members.forEach(member -> netBalances.put(member, BigDecimal.ZERO));
 
        List<Expense> groupExpenses = expenseRepository.findByGroup(group);
        List<Payment> groupPayments = paymentRepository.findByGroup(group);
 
        // Eager fetch details
        groupExpenses.forEach(exp -> {
            Hibernate.initialize(exp.getPayers());
            exp.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
            Hibernate.initialize(exp.getSplits());
            exp.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
        });
        groupPayments.forEach(p -> {
            Hibernate.initialize(p.getPaidBy());
            Hibernate.initialize(p.getPaidTo());
        });
 
        // Process Expenses
        for (Expense expense : groupExpenses) {
            expense.getPayers().forEach(payer ->
                netBalances.merge(payer.getUser(), payer.getAmountPaid(), BigDecimal::add)
            );
            expense.getSplits().forEach(split ->
                netBalances.merge(split.getOwedBy(), split.getAmountOwed().negate(), BigDecimal::add)
            );
        }
 
        // Process Payments
        for (Payment payment : groupPayments) {
            netBalances.merge(payment.getPaidBy(), payment.getAmount(), BigDecimal::add); // User who paid gets "credit"
            netBalances.merge(payment.getPaidTo(), payment.getAmount().negate(), BigDecimal::add); // User who received gets "debit"
        }
 
        // Filter out near-zero balances
        netBalances.entrySet().removeIf(entry -> entry.getValue().abs().compareTo(ZERO_THRESHOLD) < 0);
 
        return netBalances;
    }
 
    @Override // Keep only one annotation
    @Transactional(readOnly = true)
    public List<SimplifiedPaymentDto> getSimplifiedGroupPayments(Long groupId, User currentUser) {
        logger.info("Calculating simplified payments for group {} requested by user {}", groupId, currentUser.getId());
        Group group = groupService.getGroupById(groupId, currentUser); // Ensures user is member
 
        Map<User, BigDecimal> netBalances = calculateGroupNetBalances(group);
 
        // Separate into debtors and creditors
        List<Map.Entry<User, BigDecimal>> debtors = netBalances.entrySet().stream()
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) < 0)
                .sorted(Comparator.comparing(Map.Entry::getValue)) // Sort by most negative first
                .collect(Collectors.toList());
 
        List<Map.Entry<User, BigDecimal>> creditors = netBalances.entrySet().stream()
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) > 0)
                .sorted(Comparator.comparing(Map.Entry<User, BigDecimal>::getValue).reversed()) // Sort by most positive first
                .collect(Collectors.toList());
 
        List<SimplifiedPaymentDto> simplifiedPayments = new ArrayList<>();
 
        int debtorIdx = 0;
        int creditorIdx = 0;
 
        // Greedy algorithm
        while (debtorIdx < debtors.size() && creditorIdx < creditors.size()) {
            Map.Entry<User, BigDecimal> debtorEntry = debtors.get(debtorIdx);
            Map.Entry<User, BigDecimal> creditorEntry = creditors.get(creditorIdx);
 
            BigDecimal amountToTransfer = debtorEntry.getValue().abs().min(creditorEntry.getValue());
            amountToTransfer = amountToTransfer.setScale(MONETARY_SCALE, RoundingMode.HALF_UP); // Scale before using
 
            // Only create payment if amount is significant
            if (amountToTransfer.compareTo(ZERO_THRESHOLD) >= 0) {
                 simplifiedPayments.add(SimplifiedPaymentDto.builder()
                        .fromUser(userMapper.toUserResponse(debtorEntry.getKey()))
                        .toUser(userMapper.toUserResponse(creditorEntry.getKey()))
                        .amount(amountToTransfer)
                        .currency(DEFAULT_CURRENCY) // Assuming single currency for now
                        .build());
 
                // Update balances
                debtorEntry.setValue(debtorEntry.getValue().add(amountToTransfer));
                creditorEntry.setValue(creditorEntry.getValue().subtract(amountToTransfer));
            } else {
                 // If transfer amount is negligible, move past the smaller balance to avoid infinite loops on tiny amounts
                 if (debtorEntry.getValue().abs().compareTo(creditorEntry.getValue()) < 0) {
                     debtorIdx++; // Debtor owes less, move to next debtor
                 } else {
                     creditorIdx++; // Creditor is owed less, move to next creditor
                 }
                 continue; // Skip balance check below for negligible transfers
            }
 
 
            // If debtor is settled, move to the next debtor
            if (debtorEntry.getValue().abs().compareTo(ZERO_THRESHOLD) < 0) {
                debtorIdx++;
            }
 
            // If creditor is settled, move to the next creditor
            if (creditorEntry.getValue().abs().compareTo(ZERO_THRESHOLD) < 0) {
                creditorIdx++;
            }
        }
 
        logger.info("Generated {} simplified payment suggestions for group {}", simplifiedPayments.size(), groupId);
        return simplifiedPayments;
    }
}