package com.expensesage.controller;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.validation.BeanPropertyBindingResult;
import org.springframework.validation.Errors;
import org.springframework.validation.Validator;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.ExpenseCreateRequest;
import com.expensesage.dto.ExpenseResponseDto; // Added import
import com.expensesage.mapper.ExpenseMapper;
import com.expensesage.model.Expense; // Added import
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.ExpenseService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

@RestController
@RequestMapping("/api/expenses")
public class ExpenseController {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseController.class);

    private final ExpenseService expenseService;
    private final ExpenseMapper expenseMapper;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final Validator validator;

    @Autowired
    public ExpenseController(ExpenseService expenseService, ExpenseMapper expenseMapper, UserRepository userRepository, Validator validator) {
        this.expenseService = expenseService;
        this.expenseMapper = expenseMapper;
        this.userRepository = userRepository;
        this.objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        this.validator = validator;
    }

    // Helper method to get current authenticated user
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || !(authentication.getPrincipal() instanceof UserDetailsImpl)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user not found in database"));
    }


    @PostMapping(consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    public ResponseEntity<?> createExpense(
            @RequestPart("expenseData") String expenseDataJson,
            @RequestPart(value = "receiptFile", required = false) MultipartFile receiptFile) {

        logger.info("Received create expense request");
        ExpenseCreateRequest request;
        try {
            request = objectMapper.readValue(expenseDataJson, ExpenseCreateRequest.class);
            logger.debug("Parsed expenseData: {}", request);

            Errors errors = new BeanPropertyBindingResult(request, "expenseCreateRequest");
            validator.validate(request, errors);
            if (errors.hasErrors()) {
                List<String> errorMessages = errors.getAllErrors().stream()
                        .map(error -> error.getDefaultMessage())
                        .collect(Collectors.toList());
                logger.warn("Validation failed for create expense request: {}", errorMessages);
                return ResponseEntity.badRequest().body(Map.of(
                    "timestamp", LocalDateTime.now().toString(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "error", "Bad Request",
                    "message", "Validation failed",
                    "details", errorMessages,
                    "path", "/api/expenses"
                ));
            }

        } catch (JsonProcessingException e) {
            logger.error("Error parsing expenseData JSON: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON format for expenseData.", e);
        } catch (Exception e) {
             logger.error("Unexpected error during request processing: {}", e.getMessage(), e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing request data.");
        }

        try {
            User currentUser = getCurrentUser();
            // Call createExpense without receiptFile
            Expense newExpense = expenseService.createExpense(request, receiptFile, currentUser);            return ResponseEntity.status(HttpStatus.CREATED).body(expenseMapper.toExpenseResponseDto(newExpense));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (RuntimeException e) {
             if (e instanceof SecurityException) {
                 throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
             }
            logger.error("Error creating expense: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
             logger.error("Unexpected error creating expense: {}", e.getMessage(), e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred while creating the expense.");
        }
    }


    @GetMapping("/{expenseId}")
    public ResponseEntity<ExpenseResponseDto> getExpenseById(@PathVariable Long expenseId) {
        try {
            User currentUser = getCurrentUser();
            Expense expense = expenseService.getExpenseById(expenseId, currentUser);
            return ResponseEntity.ok(expenseMapper.toExpenseResponseDto(expense));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/my")
    public ResponseEntity<List<ExpenseResponseDto>> getMyExpenses() {
        User currentUser = getCurrentUser();
        List<Expense> expenses = expenseService.getExpensesForUser(currentUser);
        return ResponseEntity.ok(expenseMapper.toExpenseResponseDtoList(expenses));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<List<ExpenseResponseDto>> getGroupExpenses(@PathVariable Long groupId) {
         try {
            User currentUser = getCurrentUser();
            List<Expense> expenses = expenseService.getExpensesForGroup(groupId, currentUser);
            return ResponseEntity.ok(expenseMapper.toExpenseResponseDtoList(expenses));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PutMapping(value = "/{expenseId}", consumes = { MediaType.MULTIPART_FORM_DATA_VALUE })
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateExpense(
            @PathVariable Long expenseId,
            @RequestPart("expenseData") String expenseDataJson,
            @RequestPart(value = "receiptFile", required = false) MultipartFile receiptFile) {

        logger.info("Received update expense request for ID: {}", expenseId);
        ExpenseCreateRequest request;
        try {
            request = objectMapper.readValue(expenseDataJson, ExpenseCreateRequest.class);
             logger.debug("Parsed expenseData for update: {}", request);

            Errors errors = new BeanPropertyBindingResult(request, "expenseCreateRequest");
            validator.validate(request, errors);
            if (errors.hasErrors()) {
                List<String> errorMessages = errors.getAllErrors().stream()
                        .map(error -> error.getDefaultMessage())
                        .collect(Collectors.toList());
                logger.warn("Validation failed for update expense request {}: {}", expenseId, errorMessages);
                return ResponseEntity.badRequest().body(Map.of(
                    "timestamp", LocalDateTime.now().toString(),
                    "status", HttpStatus.BAD_REQUEST.value(),
                    "error", "Bad Request",
                    "message", "Validation failed",
                    "details", errorMessages,
                    "path", "/api/expenses/" + expenseId
                ));
            }

        } catch (JsonProcessingException e) {
            logger.error("Error parsing expenseData JSON during update: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid JSON format for expenseData.", e);
        } catch (Exception e) {
             logger.error("Unexpected error during update request processing: {}", e.getMessage(), e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error processing update request data.");
        }

        try {
            User currentUser = getCurrentUser();
            Expense updatedExpense = expenseService.updateExpense(expenseId, request, receiptFile, currentUser);
            return ResponseEntity.ok(expenseMapper.toExpenseResponseDto(updatedExpense));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            logger.error("Error updating expense {}: {}", expenseId, e.getMessage());
            if (e.getMessage() != null && e.getMessage().contains("not found")) {
                 throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
            }
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        } catch (Exception e) {
             logger.error("Unexpected error updating expense {}: {}", expenseId, e.getMessage(), e);
             throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "An unexpected error occurred while updating the expense.");
        }
    }


    @DeleteMapping("/{expenseId}")
    public ResponseEntity<Void> deleteExpense(@PathVariable Long expenseId) {
         try {
            User currentUser = getCurrentUser();
            expenseService.deleteExpense(expenseId, currentUser);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }
}