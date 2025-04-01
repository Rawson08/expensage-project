package com.expensesage.service;

import java.util.List;

import com.expensesage.dto.PaymentCreateRequest;
import com.expensesage.model.Payment;
import com.expensesage.model.User;

public interface PaymentService {

    /**
     * Records a new payment made between users.
     *
     * @param request The DTO containing payment details.
     * @param payer   The user making the payment (authenticated user).
     * @return The newly created Payment entity.
     * @throws RuntimeException if recipient user not found, or group specified and
     *                          payer/recipient not in group.
     */
    Payment recordPayment(PaymentCreateRequest request, User payer);

    /**
     * Retrieves a payment by its ID, ensuring the current user was involved.
     *
     * @param paymentId   The ID of the payment.
     * @param currentUser The user requesting the details.
     * @return The Payment entity.
     * @throws RuntimeException if payment not found or user was not
     *                          payer/recipient.
     */
    Payment getPaymentById(Long paymentId, User currentUser);

    /**
     * Retrieves all payments where the current user was either the payer or the
     * recipient.
     *
     * @param currentUser The user whose payments to retrieve.
     * @return A list of Payment entities.
     */
    List<Payment> getPaymentsForUser(User currentUser);

    /**
     * Retrieves payments made between two specific users (in either direction).
     *
     * @param userA One user.
     * @param userB The other user.
     * @return A list of Payment entities between the two users.
     */
    List<Payment> getPaymentsBetweenUsers(User userA, User userB);

    /**
     * Retrieves payments related to a specific group.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the list (must be a member).
     * @return A list of Payment entities associated with the group.
     * @throws RuntimeException if group not found or user is not a member.
     */
    List<Payment> getPaymentsForGroup(Long groupId, User currentUser);

    /**
     * Deletes a payment, ensuring the current user was involved.
     *
     * @param paymentId   The ID of the payment to delete.
     * @param currentUser The user attempting the deletion.
     * @throws RuntimeException if payment not found or user was not involved.
     */
    void deletePayment(Long paymentId, User currentUser);

    /**
     * Updates an existing payment.
     * Only the original payer can update the payment.
     *
     * @param paymentId   The ID of the payment to update.
     * @param request     The DTO containing updated payment details.
     * @param currentUser The user attempting the update (must be the original payer).
     * @return The updated Payment entity.
     * @throws RuntimeException if payment not found, recipient not found, or permission denied.
     */
    Payment updatePayment(Long paymentId, PaymentCreateRequest request, User currentUser);

    // Deleting payments might be disallowed or restricted in a real system,
    // but could be added if needed.
    // void deletePayment(Long paymentId, User currentUser);
}