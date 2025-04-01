package com.expensesage.service;

import java.util.List;

import com.expensesage.dto.ExpenseCreateRequest;
import com.expensesage.model.Expense;
import com.expensesage.model.User;

public interface ExpenseService {

    /**
     * Creates a new expense, including payer details, and calculates the corresponding splits.
     *
     * @param request     The DTO containing expense details, payer details, and split information.
     * @param currentUser The user creating the expense (used for permission checks if needed).
     * @return The newly created Expense entity, including its payers and calculated splits.
     * @throws RuntimeException if validation fails (e.g., payer/split amounts don't sum correctly, invalid users/group).
     */
    Expense createExpense(ExpenseCreateRequest request, org.springframework.web.multipart.MultipartFile receiptFile, User currentUser); // Added receiptFile param

    /**
     * Retrieves an expense by its ID, ensuring the current user has access

    /**
     * Retrieves an expense by its ID, ensuring the current user has access
     * (e.g., they paid, are owed, or are in the associated group).
     *
     * @param expenseId   The ID of the expense.
     * @param currentUser The user requesting the expense details.
     * @return The Expense entity.
     * @throws RuntimeException if expense not found or user lacks access.
     */
    Expense getExpenseById(Long expenseId, User currentUser);

    /**
     * Retrieves all expenses related to the current user (paid by them or owed by
     * them).
     * This might involve querying both Expenses and Splits.
     * (Further refinement needed for optimal implementation).
     *
     * @param currentUser The user whose expenses to retrieve.
     * @return A list of relevant Expense entities.
     */
    List<Expense> getExpensesForUser(User currentUser);

    /**
     * Retrieves all expenses associated with a specific group.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the list (must be a member of the
     *                    group).
     * @return A list of Expense entities belonging to the group.
     * @throws RuntimeException if group not found or user is not a member.
     */
    List<Expense> getExpensesForGroup(Long groupId, User currentUser);

    /**
     * Updates an existing expense. Only the payer can update for now.
     * Recalculates splits based on the updated request.
     *
     * @param expenseId   The ID of the expense to update.
     * @param request     The DTO containing updated expense details and split
     *                    information.
     * @param currentUser The user attempting the update.
     * @return The updated Expense entity.
     * @throws RuntimeException if expense not found, validation fails, or
     *                          permission denied.
     */
    Expense updateExpense(Long expenseId, ExpenseCreateRequest request, org.springframework.web.multipart.MultipartFile receiptFile, User currentUser); // Added receiptFile param

    /**
     * Deletes an expense. Only the payer can delete for now.
     * Consider implications if payments have already been made based on this
     * expense.
     *
     * @param expenseId   The ID of the expense to delete.
     * @param currentUser The user attempting the deletion.
     * @throws RuntimeException if expense not found or permission denied.
     */
    void deleteExpense(Long expenseId, User currentUser);

}