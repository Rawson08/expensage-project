package com.expensesage.service.impl;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Map; // Added import
import java.util.HashMap; // Added import
import java.util.Set; // Added import
import java.util.stream.Collectors;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import org.mockito.junit.jupiter.MockitoExtension;

import com.expensesage.dto.BalanceDto;
import com.expensesage.dto.OverallBalanceSummaryDto;
import com.expensesage.dto.UserResponse;
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.Expense;
import com.expensesage.model.ExpensePayer;
import com.expensesage.model.Group;
import com.expensesage.model.Payment;
import com.expensesage.model.Split;
import com.expensesage.model.SplitType;
import com.expensesage.model.User;
import com.expensesage.repository.ExpensePayerRepository;
import com.expensesage.repository.ExpenseRepository;
import com.expensesage.repository.PaymentRepository;
import com.expensesage.repository.SplitRepository;
import com.expensesage.service.GroupService;

@ExtendWith(MockitoExtension.class)
class BalanceServiceImplTest {

    @Mock private ExpenseRepository expenseRepository;
    @Mock private SplitRepository splitRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private ExpensePayerRepository expensePayerRepository;
    @Mock private GroupService groupService;
    @Mock private UserMapper userMapper;

    @InjectMocks
    private BalanceServiceImpl balanceService;

    private User user1, user2, user3;
    private Expense expense1, expense2;
    private Payment payment1, payment2;
    private Group group1;

    @BeforeEach
    @SuppressWarnings("unused")
    void setUp() {
        // Add nulls for new password reset fields in User constructor
        user1 = new User(1L, "Alice", "alice@example.com", "pwd", LocalDateTime.now(), true, null, null, null, null);
        user2 = new User(2L, "Bob", "bob@example.com", "pwd", LocalDateTime.now(), true, null, null, null, null);
        user3 = new User(3L, "Charlie", "charlie@example.com", "pwd", LocalDateTime.now(), true, null, null, null, null);

        // Add simplifyDebts (false) to the Group constructor call
        group1 = new Group(10L, "Test Group", LocalDateTime.now(), user1, new HashSet<>(Arrays.asList(user1, user2, user3)), new HashSet<>(), false);

        // --- Sample Data ---
        expense1 = new Expense();
        expense1.setId(101L);
        expense1.setDescription("Dinner");
        expense1.setAmount(new BigDecimal("30.00"));
        expense1.setDate(LocalDate.now());
        expense1.setCurrency("USD");
        expense1.setCreatedAt(LocalDateTime.now());
        expense1.setSplitType(SplitType.EQUAL);
        expense1.setPayers(new HashSet<>());
        expense1.setSplits(new HashSet<>());
        Split split1_Bob = new Split(201L, new BigDecimal("15.00"), expense1, user2);
        Split split1_Charlie = new Split(202L, new BigDecimal("15.00"), expense1, user3);
        expense1.getSplits().addAll(Arrays.asList(split1_Bob, split1_Charlie));
        ExpensePayer payer1_Alice = new ExpensePayer(401L, expense1, user1, new BigDecimal("30.00"));
        expense1.getPayers().add(payer1_Alice);

        expense2 = new Expense();
        expense2.setId(102L);
        expense2.setDescription("Groceries");
        expense2.setAmount(new BigDecimal("50.00"));
        expense2.setDate(LocalDate.now());
        expense2.setCurrency("USD");
        expense2.setCreatedAt(LocalDateTime.now());
        expense2.setSplitType(SplitType.EXACT);
        expense2.setPayers(new HashSet<>());
        expense2.setSplits(new HashSet<>());
        Split split2_Alice = new Split(203L, new BigDecimal("10.00"), expense2, user1);
        Split split2_Charlie = new Split(204L, new BigDecimal("40.00"), expense2, user3);
        expense2.getSplits().addAll(Arrays.asList(split2_Alice, split2_Charlie));
        ExpensePayer payer2_Bob = new ExpensePayer(402L, expense2, user2, new BigDecimal("50.00"));
        expense2.getPayers().add(payer2_Bob);

        payment1 = new Payment(301L, new BigDecimal("5.00"), LocalDate.now(), "USD", LocalDateTime.now(), user1, user2, null);
        payment2 = new Payment(302L, new BigDecimal("20.00"), LocalDate.now(), "USD", LocalDateTime.now(), user3, user1, null);

        // --- Mocking ---
        lenient().when(userMapper.toUserResponse(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            return new UserResponse(user.getId(), user.getName(), user.getEmail(), user.getCreatedAt());
        });
    }

    // --- Tests for getBalanceBetweenUsers ---

    @Test
    void getBalanceBetweenUsers_AliceAndBob() {
        when(expensePayerRepository.findByUser(user1)).thenReturn(expense1.getPayers().stream().filter(p -> p.getUser().equals(user1)).collect(Collectors.toList()));
        when(expensePayerRepository.findByUser(user2)).thenReturn(expense2.getPayers().stream().filter(p -> p.getUser().equals(user2)).collect(Collectors.toList()));
        when(splitRepository.findByOwedBy(user1)).thenReturn(expense2.getSplits().stream().filter(s -> s.getOwedBy().equals(user1)).collect(Collectors.toList()));
        when(splitRepository.findByOwedBy(user2)).thenReturn(expense1.getSplits().stream().filter(s -> s.getOwedBy().equals(user2)).collect(Collectors.toList()));
        lenient().when(paymentRepository.findByPaidByAndPaidTo(user1, user2)).thenReturn(List.of(payment1));
        lenient().when(paymentRepository.findByPaidByAndPaidTo(user2, user1)).thenReturn(Collections.emptyList());

        BalanceDto balance = balanceService.getBalanceBetweenUsers(user1, user2);
        assertNotNull(balance);
        assertEquals(user2.getId(), balance.getOtherUser().getId());
        assertEquals(0, BigDecimal.ZERO.compareTo(balance.getNetAmount()));
        assertEquals("USD", balance.getCurrency());
    }

     @Test
    void getBalanceBetweenUsers_AliceAndCharlie() {
        when(expensePayerRepository.findByUser(user1)).thenReturn(expense1.getPayers().stream().filter(p -> p.getUser().equals(user1)).collect(Collectors.toList()));
        when(expensePayerRepository.findByUser(user3)).thenReturn(Collections.emptyList());
        when(splitRepository.findByOwedBy(user1)).thenReturn(expense2.getSplits().stream().filter(s -> s.getOwedBy().equals(user1)).collect(Collectors.toList()));
        when(splitRepository.findByOwedBy(user3)).thenReturn(Stream.concat(expense1.getSplits().stream(), expense2.getSplits().stream()).filter(s -> s.getOwedBy().equals(user3)).collect(Collectors.toList()));
        when(paymentRepository.findByPaidByAndPaidTo(user1, user3)).thenReturn(Collections.emptyList());
        when(paymentRepository.findByPaidByAndPaidTo(user3, user1)).thenReturn(List.of(payment2));

        BalanceDto balance = balanceService.getBalanceBetweenUsers(user1, user3);

        assertNotNull(balance);
        assertEquals(user3.getId(), balance.getOtherUser().getId());
        assertEquals(0, new BigDecimal("-5.00").compareTo(balance.getNetAmount().setScale(2, RoundingMode.HALF_UP)));
        assertEquals("USD", balance.getCurrency());
    }

    // --- Tests for getOverallBalances ---

    @Test
    void getOverallBalances_ForAlice() {
        when(expensePayerRepository.findByUser(user1)).thenReturn(expense1.getPayers().stream().filter(p -> p.getUser().equals(user1)).collect(Collectors.toList()));
        when(splitRepository.findByOwedBy(user1)).thenReturn(expense2.getSplits().stream().filter(s->s.getOwedBy().equals(user1)).collect(Collectors.toList()));
        when(paymentRepository.findByPaidBy(user1)).thenReturn(List.of(payment1));
        when(paymentRepository.findByPaidTo(user1)).thenReturn(List.of(payment2));

        OverallBalanceSummaryDto summary = balanceService.getOverallBalanceSummary(user1);

        assertNotNull(summary);
        assertEquals(0, new BigDecimal("35.00").compareTo(summary.getTotalOwedToUser()));
        assertEquals(0, new BigDecimal("0.00").compareTo(summary.getTotalOwedByUser()));
        assertEquals("USD", summary.getCurrency());
    }

    // --- Tests for getGroupBalances ---

     @Test
    void getGroupBalances_ForAliceInGroup1() {
        group1.setExpenses(new HashSet<>(Arrays.asList(expense1, expense2)));
        expense1.setGroup(group1);
        expense2.setGroup(group1);
        payment1.setGroup(group1);
        payment2.setGroup(group1);
        when(groupService.getGroupById(eq(group1.getId()), eq(user1))).thenReturn(group1);
        when(expenseRepository.findByGroup(group1)).thenReturn(List.of(expense1, expense2));
        when(paymentRepository.findByGroupAndPaidBy(group1, user1)).thenReturn(List.of(payment1));
        when(paymentRepository.findByGroupAndPaidTo(group1, user1)).thenReturn(List.of(payment2));

        List<BalanceDto> groupBalances = balanceService.getGroupBalances(user1, group1.getId());

         assertNotNull(groupBalances);
        assertTrue(groupBalances.size() >= 1 && groupBalances.size() <= 2, "Should have 1 or 2 balance entries");

        BalanceDto charlieBalance = groupBalances.stream().filter(b -> b.getOtherUser().getId().equals(user3.getId())).findFirst().orElse(null);
        assertNotNull(charlieBalance, "Balance with Charlie should exist");
        assertEquals(0, new BigDecimal("-5.00").compareTo(charlieBalance.getNetAmount().setScale(2, RoundingMode.HALF_UP)), "Alice should owe Charlie 5.00");

        BalanceDto bobBalance = groupBalances.stream().filter(b -> b.getOtherUser().getId().equals(user2.getId())).findFirst().orElse(null);
        if (bobBalance != null) {
             assertEquals(0, BigDecimal.ZERO.compareTo(bobBalance.getNetAmount().setScale(2, RoundingMode.HALF_UP)), "Balance with Bob should be zero");
        }
    }

}