package com.expensesage.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody; // Added import
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.PaymentCreateRequest;
import com.expensesage.dto.PaymentResponseDto;
import com.expensesage.mapper.PaymentMapper;
import com.expensesage.model.Payment;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.PaymentService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentMapper paymentMapper;
    private final UserRepository userRepository;

    @Autowired
    public PaymentController(PaymentService paymentService, PaymentMapper paymentMapper,
            UserRepository userRepository) {
        this.paymentService = paymentService;
        this.paymentMapper = paymentMapper;
        this.userRepository = userRepository;
    }

    // Helper method to get the currently authenticated User entity
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(
                        () -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Current user not found in database"));
    }

    @PostMapping
    public ResponseEntity<PaymentResponseDto> recordPayment(@Valid @RequestBody PaymentCreateRequest request) {
        try {
            User currentUser = getCurrentUser();
            Payment newPayment = paymentService.recordPayment(request, currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(paymentMapper.toPaymentResponseDto(newPayment));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            // Other errors like user/group not found
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @GetMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseDto> getPaymentById(@PathVariable Long paymentId) {
        try {
            User currentUser = getCurrentUser();
            Payment payment = paymentService.getPaymentById(paymentId, currentUser);
            return ResponseEntity.ok(paymentMapper.toPaymentResponseDto(payment));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<PaymentResponseDto>> getMyPayments() {
        User currentUser = getCurrentUser();
        List<Payment> payments = paymentService.getPaymentsForUser(currentUser);
        return ResponseEntity.ok(paymentMapper.toPaymentResponseDtoList(payments));
    }

    // Optional: Get payments between current user and another user
    @GetMapping("/between/{otherUserId}")
    public ResponseEntity<List<PaymentResponseDto>> getPaymentsWithUser(@PathVariable Long otherUserId) {
        User currentUser = getCurrentUser();
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Other user not found"));
        List<Payment> payments = paymentService.getPaymentsBetweenUsers(currentUser, otherUser);
        return ResponseEntity.ok(paymentMapper.toPaymentResponseDtoList(payments));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<PaymentResponseDto>> getGroupPayments(@PathVariable Long groupId) {
        try {
            User currentUser = getCurrentUser();
            List<Payment> payments = paymentService.getPaymentsForGroup(groupId, currentUser);
            return ResponseEntity.ok(paymentMapper.toPaymentResponseDtoList(payments));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            // Group not found or other issues
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PutMapping("/{paymentId}")
    public ResponseEntity<PaymentResponseDto> updatePayment(@PathVariable Long paymentId, @Valid @RequestBody PaymentCreateRequest request) {
        try {
            User currentUser = getCurrentUser();
            Payment updatedPayment = paymentService.updatePayment(paymentId, request, currentUser);
            return ResponseEntity.ok(paymentMapper.toPaymentResponseDto(updatedPayment));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (RuntimeException e) { // Catch not found etc.
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @DeleteMapping("/{paymentId}")
    public ResponseEntity<Void> deletePayment(@PathVariable Long paymentId) {
        try {
            User currentUser = getCurrentUser();
            paymentService.deletePayment(paymentId, currentUser);
            return ResponseEntity.noContent().build(); // 204 No Content on success
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            // Catch potential "Payment not found"
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }
}