package com.expensesage.service.impl;

import java.math.RoundingMode;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.Stream;

import org.hibernate.Hibernate; // Added import
import org.slf4j.Logger; // Added import
import org.slf4j.LoggerFactory; // Added import
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.PaymentCreateRequest;
import com.expensesage.model.Group;
import com.expensesage.model.Payment;
import com.expensesage.model.User;
import com.expensesage.repository.PaymentRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.GroupService;
import com.expensesage.service.PaymentService;

@Service
public class PaymentServiceImpl implements PaymentService {

    private static final Logger logger = LoggerFactory.getLogger(PaymentServiceImpl.class); // Added logger
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;
    // Removed BalanceService field

    private static final int MONETARY_SCALE = 2;

    @Autowired
    public PaymentServiceImpl(PaymentRepository paymentRepository, UserRepository userRepository,
                              GroupService groupService /* Removed BalanceService balanceService */) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
        this.groupService = groupService;
        // Removed balanceService assignment
    }

    @Override
    @Transactional
    public Payment recordPayment(PaymentCreateRequest request, User payer) {
        User paidTo = userRepository.findById(request.getPaidToUserId())
                .orElseThrow(
                        () -> new RuntimeException("Recipient user not found with ID: " + request.getPaidToUserId()));

        if (payer.equals(paidTo)) {
            throw new IllegalArgumentException("Payer and recipient cannot be the same user.");
        }

        Payment payment = new Payment();
        payment.setPaidBy(payer);
        payment.setPaidTo(paidTo);
        payment.setAmount(request.getAmount().setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
        payment.setDate(request.getDate());
        payment.setCurrency(request.getCurrency() != null ? request.getCurrency().toUpperCase() : "USD");

        if (request.getGroupId() != null) {
            Group group = groupService.getGroupById(request.getGroupId(), payer);
            Hibernate.initialize(group.getMembers()); // Ensure members are loaded
            if (!group.getMembers().contains(paidTo)) {
                throw new SecurityException("Recipient user is not a member of the specified group.");
            }
            payment.setGroup(group);
        }

        Payment savedPayment = paymentRepository.save(payment);

        // Balance calculation is now dynamic, no update needed here

        return savedPayment;
    }

    @Override
    @Transactional(readOnly = true)
    public Payment getPaymentById(Long paymentId, User currentUser) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

        Hibernate.initialize(payment.getPaidBy());
        Hibernate.initialize(payment.getPaidTo());

        if (!payment.getPaidBy().equals(currentUser) && !payment.getPaidTo().equals(currentUser)) {
            throw new SecurityException("You do not have permission to view this payment.");
        }
        return payment;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Payment> getPaymentsForUser(User currentUser) {
        List<Payment> paid = paymentRepository.findByPaidBy(currentUser);
        List<Payment> received = paymentRepository.findByPaidTo(currentUser);

        List<Payment> allPayments = Stream.concat(paid.stream(), received.stream())
                .distinct()
                .collect(Collectors.toList());

        allPayments.forEach(p -> {
            Hibernate.initialize(p.getPaidBy());
            Hibernate.initialize(p.getPaidTo());
            if (p.getGroup() != null) Hibernate.initialize(p.getGroup());
        });

        return allPayments;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Payment> getPaymentsBetweenUsers(User userA, User userB) {
        List<Payment> payments = paymentRepository.findPaymentsBetweenUsers(userA, userB);
        payments.forEach(p -> {
             Hibernate.initialize(p.getPaidBy());
             Hibernate.initialize(p.getPaidTo());
            if (p.getGroup() != null) Hibernate.initialize(p.getGroup());
        });
        return payments;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Payment> getPaymentsForGroup(Long groupId, User currentUser) {
        Group group = groupService.getGroupById(groupId, currentUser);
        List<Payment> payments = paymentRepository.findByGroup(group);
        payments.forEach(p -> {
            Hibernate.initialize(p.getPaidBy());
            Hibernate.initialize(p.getPaidTo());
        });
        return payments;
    }

    @Override
    @Transactional
    public void deletePayment(Long paymentId, User currentUser) {
        logger.info("User {} attempting to delete payment ID: {}", currentUser.getId(), paymentId);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

        // Eager fetch users involved
        Hibernate.initialize(payment.getPaidBy());
        Hibernate.initialize(payment.getPaidTo());

        // Authorization check: Only payer or recipient can delete
        if (!payment.getPaidBy().equals(currentUser) && !payment.getPaidTo().equals(currentUser)) {
            logger.warn("User {} is not authorized to delete payment ID: {}", currentUser.getId(), paymentId);
            throw new SecurityException("You are not authorized to delete this payment.");
        }

        paymentRepository.delete(payment);
        logger.info("Payment ID: {} deleted successfully by User {}", paymentId, currentUser.getId());

        // Note: Since balances are calculated dynamically, no balance update is needed here.
    }

    @Override
    @Transactional
    public Payment updatePayment(Long paymentId, PaymentCreateRequest request, User currentUser) {
        logger.info("User {} attempting to update payment ID: {}", currentUser.getId(), paymentId);
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Payment not found with ID: " + paymentId));

        // Eager fetch original payer
        Hibernate.initialize(payment.getPaidBy());

        // Authorization check: Only the original payer can update
        if (!payment.getPaidBy().equals(currentUser)) {
            logger.warn("User {} is not authorized to update payment ID: {} (not original payer)", currentUser.getId(), paymentId);
            throw new SecurityException("Only the payer can update a payment.");
        }

        // Validate new recipient
        User paidTo = userRepository.findById(request.getPaidToUserId())
                .orElseThrow(() -> new RuntimeException("Recipient user not found with ID: " + request.getPaidToUserId()));

        // Prevent paying self
        if (currentUser.equals(paidTo)) {
            throw new IllegalArgumentException("Payer and recipient cannot be the same user.");
        }

        // Validate group membership if group is involved
        Group group = null; // Assume no group unless specified
        if (request.getGroupId() != null) {
            // Use the payer (currentUser) to validate group access
            group = groupService.getGroupById(request.getGroupId(), currentUser);
            Hibernate.initialize(group.getMembers());
            if (!group.getMembers().contains(paidTo)) {
                throw new SecurityException("Recipient user is not a member of the specified group.");
            }
        } else if (payment.getGroup() != null) {
            // If removing payment from a group, set group to null
            logger.info("Removing payment {} from group {}", paymentId, payment.getGroup().getId());
        }

        // Update payment fields
        payment.setPaidTo(paidTo);
        payment.setAmount(request.getAmount().setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
        payment.setDate(request.getDate());
        payment.setCurrency(request.getCurrency() != null ? request.getCurrency().toUpperCase() : "USD");
        payment.setGroup(group); // Set to new group or null

        Payment updatedPayment = paymentRepository.save(payment);
        logger.info("Payment ID: {} updated successfully by User {}", paymentId, currentUser.getId());

        // Balances are dynamic, no update needed
        return updatedPayment;
    }
}