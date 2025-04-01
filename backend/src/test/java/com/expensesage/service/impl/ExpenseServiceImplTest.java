package com.expensesage.service.impl;

import java.math.BigDecimal;
import java.time.LocalDate; // Import PayerDetailDto
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Arrays; // Import repository
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.fail;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import static org.mockito.Mockito.lenient; // Ensure Stream is imported
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import org.mockito.junit.jupiter.MockitoExtension;

import com.expensesage.dto.ExpenseCreateRequest;
import com.expensesage.dto.PayerDetailDto;
import com.expensesage.dto.SplitDetailDto;
import com.expensesage.model.Expense;
import com.expensesage.model.Group;
import com.expensesage.model.Split;
import com.expensesage.model.SplitType;
import com.expensesage.model.User;
import com.expensesage.repository.ExpenseRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.GroupService;

@ExtendWith(MockitoExtension.class)
class ExpenseServiceImplTest {

    @Mock private UserRepository userRepository;
    @Mock private ExpenseRepository expenseRepository;
    @Mock private GroupService groupService;

    @InjectMocks
    private ExpenseServiceImpl expenseService;

    private User user1, user2, user3;
    private Group group1;

    @BeforeEach
    @SuppressWarnings("unused") // Suppress hint as setup is used by tests accessing fields
    void setUp() {
        // Add nulls for new password reset fields in User constructor
        user1 = new User(1L, "Alice", "alice@example.com", "hashedpassword", LocalDateTime.now(), true, null, null, null, null);
        user2 = new User(2L, "Bob", "bob@example.com", "hashedpassword", LocalDateTime.now(), true, null, null, null, null);
        user3 = new User(3L, "Charlie", "charlie@example.com", "hashedpassword", LocalDateTime.now(), true, null, null, null, null);

        group1 = new Group(10L, "Test Group", LocalDateTime.now(), user1, new HashSet<>(Arrays.asList(user1, user2, user3)), new HashSet<>());

        // Basic mock behavior
        lenient().when(userRepository.findAllById(any())).thenAnswer(invocation -> {
             Set<Long> ids = invocation.getArgument(0);
             List<User> users = new ArrayList<>();
             if (ids != null) {
                 if (ids.contains(1L)) users.add(user1);
                 if (ids.contains(2L)) users.add(user2);
                 if (ids.contains(3L)) users.add(user3);
             }
             return users;
         });
         lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(user1));
         lenient().when(userRepository.findById(2L)).thenReturn(Optional.of(user2));
         lenient().when(userRepository.findById(3L)).thenReturn(Optional.of(user3));

         lenient().when(expenseRepository.save(any(Expense.class))).thenAnswer(invocation -> {
             Expense expense = invocation.getArgument(0);
             if (expense.getId() == null) expense.setId(System.currentTimeMillis());
             expense.getPayers().forEach(p -> p.setExpense(expense));
             expense.getSplits().forEach(s -> s.setExpense(expense));
             return expense;
         });
         lenient().when(groupService.getGroupById(eq(10L), any(User.class))).thenReturn(group1);
    }

    // Helper to create payer list for requests
    private List<PayerDetailDto> createPayers(User payer, BigDecimal amount) {
        return List.of(new PayerDetailDto(payer.getId(), amount));
    }

    // --- Test Cases for createExpense ---

    @Test
    void createExpense_EqualSplit_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("30.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), null),
                new SplitDetailDto(user3.getId(), null)
        );
        ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Dinner", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(2, createdExpense.getSplits().size());

        BigDecimal expectedAmount = new BigDecimal("15.00");
        for (Split split : createdExpense.getSplits()) {
            assertTrue(split.getOwedBy().equals(user2) || split.getOwedBy().equals(user3));
            assertEquals(expectedAmount, split.getAmountOwed());
        }
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }

     @Test
    void createExpense_EqualSplit_WithRemainder_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("10.01");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                 new SplitDetailDto(user2.getId(), null),
                 new SplitDetailDto(user3.getId(), null)
         );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Snacks", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EQUAL, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(2, createdExpense.getSplits().size());

        BigDecimal totalSplit = BigDecimal.ZERO;
        boolean found501 = false;
        boolean found500 = false;
        for (Split split : createdExpense.getSplits()) {
             totalSplit = totalSplit.add(split.getAmountOwed());
             if (split.getAmountOwed().compareTo(new BigDecimal("5.01")) == 0) found501 = true;
             if (split.getAmountOwed().compareTo(new BigDecimal("5.00")) == 0) found500 = true;
        }
        assertEquals(totalAmount, totalSplit);
        assertTrue(found501, "Should have one split of 5.01");
        assertTrue(found500, "Should have one split of 5.00");
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }


    @Test
    void createExpense_ExactSplit_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("50.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), new BigDecimal("20.00")),
                new SplitDetailDto(user3.getId(), new BigDecimal("30.00"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Groceries", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EXACT, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(2, createdExpense.getSplits().size());

        for (Split split : createdExpense.getSplits()) {
            if (split.getOwedBy().equals(user2)) assertEquals(new BigDecimal("20.00"), split.getAmountOwed());
            else if (split.getOwedBy().equals(user3)) assertEquals(new BigDecimal("30.00"), split.getAmountOwed());
            else fail("Unexpected user in split: " + split.getOwedBy().getName());
        }
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }

     @Test
    void createExpense_ExactSplit_Mismatch_ThrowsException() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("50.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), new BigDecimal("20.00")),
                new SplitDetailDto(user3.getId(), new BigDecimal("30.01"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Groceries Mismatch", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.EXACT, splits, null
        );

        // Act & Assert
        IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            expenseService.createExpense(request, null, user1);
        });
        assertTrue(exception.getMessage().contains("Sum of exact split amounts"));
        verify(expenseRepository, never()).save(any(Expense.class));
    }

     @Test
    void createExpense_PercentageSplit_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("100.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), new BigDecimal("40.0")),
                new SplitDetailDto(user3.getId(), new BigDecimal("60.0"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Utilities", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.PERCENTAGE, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(2, createdExpense.getSplits().size());

        BigDecimal totalSplit = BigDecimal.ZERO;
        for (Split split : createdExpense.getSplits()) {
             totalSplit = totalSplit.add(split.getAmountOwed());
            if (split.getOwedBy().equals(user2)) assertEquals(new BigDecimal("40.00"), split.getAmountOwed());
            else if (split.getOwedBy().equals(user3)) assertEquals(new BigDecimal("60.00"), split.getAmountOwed());
            else fail("Unexpected user in split: " + split.getOwedBy().getName());
        }
         assertEquals(totalAmount, totalSplit);
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }

     @Test
    void createExpense_PercentageSplit_Mismatch_ThrowsException() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("100.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), new BigDecimal("40.0")),
                new SplitDetailDto(user3.getId(), new BigDecimal("60.1"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Utilities Mismatch", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.PERCENTAGE, splits, null
        );

        // Act & Assert
         IllegalArgumentException exception = assertThrows(IllegalArgumentException.class, () -> {
            expenseService.createExpense(request, null, user1);
        });
        assertTrue(exception.getMessage().contains("Percentages must add up to 100%"));
        verify(expenseRepository, never()).save(any(Expense.class));
    }

     @Test
    void createExpense_ShareSplit_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("75.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), new BigDecimal("1")),
                new SplitDetailDto(user3.getId(), new BigDecimal("2"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Tickets", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.SHARE, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(2, createdExpense.getSplits().size());

        BigDecimal totalSplit = BigDecimal.ZERO;
        for (Split split : createdExpense.getSplits()) {
             totalSplit = totalSplit.add(split.getAmountOwed());
            if (split.getOwedBy().equals(user2)) assertEquals(new BigDecimal("25.00"), split.getAmountOwed());
            else if (split.getOwedBy().equals(user3)) assertEquals(new BigDecimal("50.00"), split.getAmountOwed());
            else fail("Unexpected user in split: " + split.getOwedBy().getName());
        }
         assertEquals(totalAmount, totalSplit);
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }

     @Test
    void createExpense_ShareSplit_PayerHasShares_Success() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("100.00");
        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user1.getId(), new BigDecimal("1")),
                new SplitDetailDto(user2.getId(), new BigDecimal("1")),
                new SplitDetailDto(user3.getId(), new BigDecimal("2"))
        );
         ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Shared Stuff", totalAmount, LocalDate.now(), "USD", null, payers, SplitType.SHARE, splits, null
        );

        // Act
        Expense createdExpense = expenseService.createExpense(request, null, user1);

        // Assert
        assertNotNull(createdExpense);
        assertEquals(totalAmount.setScale(2), createdExpense.getAmount());
        assertEquals(1, createdExpense.getPayers().size());
        assertEquals(user1, createdExpense.getPayers().iterator().next().getUser());
        assertEquals(3, createdExpense.getSplits().size());

        BigDecimal totalSplit = BigDecimal.ZERO;
        for (Split split : createdExpense.getSplits()) {
             totalSplit = totalSplit.add(split.getAmountOwed());
            if (split.getOwedBy().equals(user1)) assertEquals(new BigDecimal("25.00"), split.getAmountOwed());
            else if (split.getOwedBy().equals(user2)) assertEquals(new BigDecimal("25.00"), split.getAmountOwed());
            else if (split.getOwedBy().equals(user3)) assertEquals(new BigDecimal("50.00"), split.getAmountOwed());
            else fail("Unexpected user in split: " + split.getOwedBy().getName());
        }
         assertEquals(totalAmount, totalSplit);
        verify(expenseRepository, times(1)).save(any(Expense.class));
    }


    @Test
    void createExpense_InGroup_UserNotInGroup_ThrowsException() {
        // Arrange
        BigDecimal totalAmount = new BigDecimal("30.00");
        // Add nulls for new password reset fields in User constructor
        User user4_notInGroup = new User(4L, "David", "david@example.com", "pwd", null, true, null, null, null, null);
        // Need to mock finding user 4
        lenient().when(userRepository.findAllById(any())).thenAnswer(invocation -> {
             Set<Long> ids = invocation.getArgument(0);
             List<User> users = new ArrayList<>();
             if (ids.contains(1L)) users.add(user1);
             if (ids.contains(2L)) users.add(user2);
             if (ids.contains(4L)) users.add(user4_notInGroup);
             return users;
         });
         lenient().when(userRepository.findById(4L)).thenReturn(Optional.of(user4_notInGroup));


        List<PayerDetailDto> payers = createPayers(user1, totalAmount);
        List<SplitDetailDto> splits = Arrays.asList(
                new SplitDetailDto(user2.getId(), null),
                new SplitDetailDto(user4_notInGroup.getId(), null)
        );
        ExpenseCreateRequest request = new ExpenseCreateRequest(
                "Group Dinner", totalAmount, LocalDate.now(), "USD", group1.getId(), payers, SplitType.EQUAL, splits, null
        );

        // Act & Assert
        RuntimeException exception = assertThrows(RuntimeException.class, () -> {
            expenseService.createExpense(request, null, user1);
        });
        assertTrue(exception.getMessage().contains("is not a member of the specified group"));
        verify(expenseRepository, never()).save(any(Expense.class));
    }

    // --- Add more tests ---

}