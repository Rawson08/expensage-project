package com.expensesage.mapper;

import java.util.List;
import java.util.Set; // Import PayerResponseDto
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component; // Import ExpensePayer

import com.expensesage.dto.ExpenseResponseDto;
import com.expensesage.dto.PayerResponseDto;
import com.expensesage.dto.SplitResponseDto;
import com.expensesage.model.Expense;
import com.expensesage.model.ExpensePayer;
import com.expensesage.model.Split;

@Component
public class ExpenseMapper {

    @Autowired
    private UserMapper userMapper; // To map User entities

    // Mapper for ExpensePayer to PayerResponseDto
    public PayerResponseDto toPayerResponseDto(ExpensePayer payer) {
        if (payer == null) {
            return null;
        }
        return new PayerResponseDto(
            userMapper.toUserResponse(payer.getUser()),
            payer.getAmountPaid()
        );
    }

    public List<PayerResponseDto> toPayerResponseDtoList(Set<ExpensePayer> payers) {
         if (payers == null) {
            return null;
        }
        return payers.stream()
                .map(this::toPayerResponseDto)
                .collect(Collectors.toList());
    }


    public SplitResponseDto toSplitResponseDto(Split split) {
        if (split == null) {
            return null;
        }
        return new SplitResponseDto(
                split.getId(),
                userMapper.toUserResponse(split.getOwedBy()),
                split.getAmountOwed()
        );
    }

    // Changed return type from Set to List to match TransactionDto
    public List<SplitResponseDto> toSplitResponseDtoList(Set<Split> splits) {
        if (splits == null) {
            return null; // Or return empty list: Collections.emptyList();
        }
        return splits.stream()
                .map(this::toSplitResponseDto)
                .collect(Collectors.toList()); // Collect to List
    }

    public ExpenseResponseDto toExpenseResponseDto(Expense expense) {
        if (expense == null) {
            return null;
        }
        return new ExpenseResponseDto(
                expense.getId(),
                expense.getDescription(),
                expense.getAmount(),
                expense.getCurrency(),
                expense.getDate(),
                expense.getCreatedAt(),
                // userMapper.toUserResponse(expense.getPaidBy()),
                toPayerResponseDtoList(expense.getPayers()),
                expense.getGroup() != null ? expense.getGroup().getId() : null,
                expense.getSplitType(),
                toSplitResponseDtoList(expense.getSplits()),
                expense.getNotes(),
                expense.getReceiptUrl() // Added receiptUrl mapping
        );
    }

    public List<ExpenseResponseDto> toExpenseResponseDtoList(List<Expense> expenses) {
        if (expenses == null) {
            return null;
        }
        return expenses.stream()
                .map(this::toExpenseResponseDto)
                .collect(Collectors.toList());
    }
}