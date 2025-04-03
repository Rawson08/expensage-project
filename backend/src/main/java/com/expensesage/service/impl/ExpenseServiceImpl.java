package com.expensesage.service.impl;

import java.io.IOException; // Added for file upload
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID; // Added for unique filenames
import java.util.stream.Collectors;

import org.hibernate.Hibernate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy; // Keep if needed
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils; // Added for filename cleaning
import org.springframework.web.multipart.MultipartFile;

import com.expensesage.dto.ExpenseCreateRequest;
import com.expensesage.dto.PayerDetailDto;
import com.expensesage.dto.SplitDetailDto;
import com.expensesage.model.Expense;
import com.expensesage.model.ExpensePayer;
import com.expensesage.model.Group;
import com.expensesage.model.Split;
import com.expensesage.model.SplitType;
import com.expensesage.model.User;
import com.expensesage.repository.ExpensePayerRepository;
import com.expensesage.repository.ExpenseRepository;
import com.expensesage.repository.SplitRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.ExpenseService;
import com.expensesage.service.GroupService;
import com.expensesage.service.NotificationService; // Import NotificationService

import software.amazon.awssdk.core.exception.SdkException; // Added SdkException
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest; // Added for delete
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.model.S3Exception; // Added S3Exception


@Service
public class ExpenseServiceImpl implements ExpenseService {

    private static final Logger logger = LoggerFactory.getLogger(ExpenseServiceImpl.class);
    private static final int MONETARY_SCALE = 2;
    private static final int CALCULATION_SCALE = 10;
    private static final BigDecimal ZERO_THRESHOLD = new BigDecimal("0.005");

    private final ExpenseRepository expenseRepository;
    private final UserRepository userRepository;
    private final GroupService groupService;
    private final SplitRepository splitRepository;
    private final ExpensePayerRepository expensePayerRepository;
    private final S3Client s3Client;
    private final String r2BucketName;
    private final String r2EndpointUrl;
    private final String r2PublicUrlBase;
    private final NotificationService notificationService; // Add NotificationService field
  

    @Autowired
    public ExpenseServiceImpl(ExpenseRepository expenseRepository,
                              UserRepository userRepository,
                              @Lazy GroupService groupService,
                              SplitRepository splitRepository,
                              ExpensePayerRepository expensePayerRepository,
                              S3Client s3Client,
                              @Value("${r2.bucket.name}") String r2BucketName,
                              @Value("${r2.endpoint.url}") String r2EndpointUrl,
                              @Value("${r2.public.url.base}") String r2PublicUrlBase,
                              NotificationService notificationService // Inject NotificationService
                              ) {
        this.expenseRepository = expenseRepository;
        this.userRepository = userRepository;
        this.groupService = groupService;
        this.splitRepository = splitRepository;
        this.expensePayerRepository = expensePayerRepository;
        this.s3Client = s3Client;
        this.r2BucketName = r2BucketName;
        this.r2EndpointUrl = r2EndpointUrl;
        this.r2PublicUrlBase = r2PublicUrlBase;
        this.notificationService = notificationService; // Assign NotificationService
       }

    @Override
    @Transactional
    public Expense createExpense(ExpenseCreateRequest request, MultipartFile receiptFile, User currentUser) { // Added receiptFile param
        logger.info("Creating new expense: {}", request.getDescription());

        Expense expense = new Expense();
        expense.setDescription(request.getDescription());
        expense.setAmount(request.getAmount().setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
        expense.setDate(request.getDate() != null ? request.getDate() : LocalDate.now());
        expense.setCurrency(request.getCurrency() != null ? request.getCurrency().toUpperCase() : "USD");
        expense.setSplitType(request.getSplitType());
        expense.setNotes(request.getNotes());

        // Handle Receipt Upload BEFORE saving expense initially
        String receiptUrl = uploadReceipt(receiptFile);
        expense.setReceiptUrl(receiptUrl); // Set URL on entity

        Group group = null;
        if (request.getGroupId() != null) {
            group = groupService.getGroupById(request.getGroupId(), currentUser);
            expense.setGroup(group);
        }

        // --- Payer Processing ---
        Map<Long, User> payerUsers = validateAndFetchPayerUsers(request.getPayers(), group);
        validatePayerAmounts(request.getPayers(), expense.getAmount());
        Set<ExpensePayer> payers = createExpensePayers(request.getPayers(), payerUsers, expense);
        payers.forEach(expense::addPayer);

        // --- Split Processing ---
        Map<Long, User> splitUsers = validateAndFetchSplitUsers(request.getSplits(), group);
        Set<Split> calculatedSplits = calculateSplits(request, splitUsers, expense.getAmount());
        calculatedSplits.forEach(expense::addSplit);

        logger.info("Saving new expense: {}", expense.getDescription());
        Expense savedExpense = expenseRepository.save(expense);
      
        // --- Send Notification ---
        if (savedExpense.getGroup() != null) {
            try {
                // Ensure members are loaded (might already be due to validation, but good practice)
                Hibernate.initialize(savedExpense.getGroup().getMembers());
                Set<User> membersToNotify = savedExpense.getGroup().getMembers().stream()
                        .filter(member -> !member.getId().equals(currentUser.getId())) // Exclude the creator
                        .collect(Collectors.toSet());
      
                if (!membersToNotify.isEmpty()) {
                    String title = "New Expense in " + savedExpense.getGroup().getName();
                    String body = String.format("%s added '%s' (%s %s)",
                            currentUser.getName(),
                            savedExpense.getDescription(),
                            savedExpense.getAmount().toPlainString(),
                            savedExpense.getCurrency());
                    // Payload for frontend to navigate on click
                    Map<String, String> payload = Map.of(
                        "type", "new_expense",
                        "groupId", savedExpense.getGroup().getId().toString(),
                        "expenseId", savedExpense.getId().toString()
                    );
                    notificationService.sendNotificationToUsers(membersToNotify, title, body, payload);
                }
            } catch (Exception e) {
                // Log notification error but don't fail the expense creation
                logger.error("Failed to send notification for new expense {} in group {}: {}",
                             savedExpense.getId(), savedExpense.getGroup().getId(), e.getMessage());
            }
        }
      
        return savedExpense;
    }

     private Map<Long, User> validateAndFetchPayerUsers(List<PayerDetailDto> payerDtos, Group group) {
        if (payerDtos == null || payerDtos.isEmpty()) {
            throw new IllegalArgumentException("At least one payer must be specified.");
        }
        Set<Long> payerIds = payerDtos.stream().map(PayerDetailDto::getUserId).collect(Collectors.toSet());
        List<User> foundUsers = userRepository.findAllById(payerIds);
        Map<Long, User> userMap = foundUsers.stream().collect(Collectors.toMap(User::getId, user -> user));

        if (userMap.size() != payerIds.size()) {
            Set<Long> foundIds = userMap.keySet();
            payerIds.removeAll(foundIds);
            throw new IllegalArgumentException("Invalid payer user IDs specified: " + payerIds);
        }

        if (group != null) {
            Set<User> groupMembers = group.getMembers();
            Hibernate.initialize(groupMembers);
            for (User payer : userMap.values()) {
                if (!groupMembers.contains(payer)) {
                    throw new IllegalArgumentException("Payer " + payer.getEmail() + " is not a member of the group.");
                }
            }
        }
        return userMap;
    }

    private void validatePayerAmounts(List<PayerDetailDto> payerDtos, BigDecimal totalExpenseAmount) {
        BigDecimal totalPaid = payerDtos.stream()
                                        .map(PayerDetailDto::getAmountPaid)
                                        .reduce(BigDecimal.ZERO, BigDecimal::add);
        if (totalPaid.setScale(MONETARY_SCALE, RoundingMode.HALF_UP).compareTo(totalExpenseAmount.setScale(MONETARY_SCALE, RoundingMode.HALF_UP)) != 0) {
            throw new IllegalArgumentException("Sum of amounts paid (" + totalPaid.setScale(MONETARY_SCALE, RoundingMode.HALF_UP) + ") does not match total expense amount (" + totalExpenseAmount.setScale(MONETARY_SCALE, RoundingMode.HALF_UP) + ").");
        }
    }

     private Set<ExpensePayer> createExpensePayers(List<PayerDetailDto> payerDtos, Map<Long, User> userMap, Expense expense) {
        Set<ExpensePayer> payers = new HashSet<>();
        for (PayerDetailDto dto : payerDtos) {
            ExpensePayer payer = new ExpensePayer();
            payer.setUser(userMap.get(dto.getUserId()));
            payer.setAmountPaid(dto.getAmountPaid().setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
            payers.add(payer);
        }
        return payers;
    }

    private Map<Long, User> validateAndFetchSplitUsers(List<SplitDetailDto> splitDtos, Group group) {
         if (splitDtos == null || splitDtos.isEmpty()) {
            throw new IllegalArgumentException("At least one split must be specified.");
        }
        Set<Long> splitUserIds = splitDtos.stream().map(SplitDetailDto::getUserId).collect(Collectors.toSet());
        List<User> foundUsers = userRepository.findAllById(splitUserIds);
        Map<Long, User> userMap = foundUsers.stream().collect(Collectors.toMap(User::getId, user -> user));

        if (userMap.size() != splitUserIds.size()) {
            Set<Long> foundIds = userMap.keySet();
            splitUserIds.removeAll(foundIds);
            throw new IllegalArgumentException("Invalid user IDs specified in splits: " + splitUserIds);
        }

        if (group != null) {
             Set<User> groupMembers = group.getMembers();
             Hibernate.initialize(groupMembers);
            for (User splitUser : userMap.values()) {
                if (!groupMembers.contains(splitUser)) {
                    throw new IllegalArgumentException("User " + splitUser.getEmail() + " in split is not a member of the group.");
                }
            }
        }
        return userMap;
    }


    private Set<Split> calculateSplits(ExpenseCreateRequest request, Map<Long, User> involvedUsers, BigDecimal totalAmount) {
        Set<Split> splits = new HashSet<>();
        BigDecimal totalCalculated = BigDecimal.ZERO;

        Set<Long> usersInSplitRequest = request.getSplits().stream()
                                                .map(SplitDetailDto::getUserId)
                                                .collect(Collectors.toSet());

        Map<Long, User> usersToSplitAmong = involvedUsers.entrySet().stream()
                .filter(entry -> usersInSplitRequest.contains(entry.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue));

        switch (request.getSplitType()) {
            case EQUAL -> {
                int numberOfParticipants = usersToSplitAmong.size();
                if (numberOfParticipants > 0) {
                    BigDecimal amountPerPerson = totalAmount.divide(BigDecimal.valueOf(numberOfParticipants), MONETARY_SCALE, RoundingMode.DOWN);
                    BigDecimal equalSplitRunningTotal = BigDecimal.ZERO;
                    List<User> sortedParticipants = new ArrayList<>(usersToSplitAmong.values());
                    Collections.sort(sortedParticipants, Comparator.comparing(User::getId));

                    for (int i = 0; i < numberOfParticipants; i++) {
                        User participant = sortedParticipants.get(i);
                        BigDecimal finalAmount = (i < numberOfParticipants - 1) ? amountPerPerson : totalAmount.subtract(equalSplitRunningTotal);
                        if (i < numberOfParticipants - 1) equalSplitRunningTotal = equalSplitRunningTotal.add(finalAmount);

                        Split split = new Split();
                        split.setOwedBy(participant);
                        split.setAmountOwed(finalAmount.setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
                        splits.add(split);
                    }
                } else {
                     logger.warn("EQUAL split requested but no users specified in splits list.");
                }
            }
            case EXACT, PERCENTAGE, SHARE -> {
                Map<Long, BigDecimal> valuesMap = request.getSplits().stream()
                    .filter(s -> s.getValue() != null)
                    .collect(Collectors.toMap(SplitDetailDto::getUserId, s -> new BigDecimal(s.getValue().toString())));

                if (valuesMap.isEmpty()) {
                     throw new IllegalArgumentException("No split values provided for " + request.getSplitType() + " split.");
                }

                BigDecimal totalSplitValue = valuesMap.values().stream().reduce(BigDecimal.ZERO, BigDecimal::add);

                if (request.getSplitType() == SplitType.EXACT && totalAmount.compareTo(totalSplitValue.setScale(MONETARY_SCALE, RoundingMode.HALF_UP)) != 0) {
                    throw new IllegalArgumentException("Sum of exact split amounts (" + totalSplitValue.setScale(MONETARY_SCALE, RoundingMode.HALF_UP) + ") does not match total expense amount (" + totalAmount + ").");
                } else if (request.getSplitType() == SplitType.PERCENTAGE && totalSplitValue.compareTo(new BigDecimal(100)) != 0) {
                    throw new IllegalArgumentException("Percentages must add up to 100.");
                }

                BigDecimal valuePerShare = (request.getSplitType() == SplitType.SHARE && totalSplitValue.compareTo(BigDecimal.ZERO) > 0)
                    ? totalAmount.divide(totalSplitValue, CALCULATION_SCALE, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;

                BigDecimal runningTotal = BigDecimal.ZERO;
                List<SplitDetailDto> sortedSplitDtos = request.getSplits().stream()
                                                              .sorted(Comparator.comparing(SplitDetailDto::getUserId))
                                                              .collect(Collectors.toList());
                int splitCount = sortedSplitDtos.size();

                for (int i = 0; i < splitCount; i++) {
                    SplitDetailDto splitDetail = sortedSplitDtos.get(i);
                    User user = involvedUsers.get(splitDetail.getUserId());
                    BigDecimal valueFromDetail = new BigDecimal(splitDetail.getValue().toString());
                    BigDecimal amountForThisSplit;

                    switch(request.getSplitType()) {
                        case EXACT: amountForThisSplit = valueFromDetail; break;
                        case PERCENTAGE: amountForThisSplit = totalAmount.multiply(valueFromDetail).divide(new BigDecimal(100), CALCULATION_SCALE, RoundingMode.HALF_UP); break;
                        case SHARE: amountForThisSplit = valuePerShare.multiply(valueFromDetail); break;
                        default: throw new IllegalStateException("Unexpected split type inside loop");
                    }

                    if (i == splitCount - 1 && request.getSplitType() != SplitType.EXACT) {
                        amountForThisSplit = totalAmount.subtract(runningTotal);
                    }

                    BigDecimal roundedAmount = amountForThisSplit.setScale(MONETARY_SCALE, RoundingMode.HALF_UP);
                    Split split = new Split();
                    split.setOwedBy(user);
                    split.setAmountOwed(roundedAmount);
                    splits.add(split);

                    if (i < splitCount - 1) runningTotal = runningTotal.add(roundedAmount);
                    totalCalculated = totalCalculated.add(roundedAmount);
                }
                 if (request.getSplitType() != SplitType.EXACT && totalCalculated.subtract(totalAmount).abs().compareTo(ZERO_THRESHOLD) > 0) {
                     logger.error("{} split sum mismatch after remainder. Expected: {}, Got: {}", request.getSplitType(), totalAmount, totalCalculated);
                     throw new IllegalStateException("Internal calculation error during " + request.getSplitType() + " split.");
                 }
            }
            default -> throw new IllegalArgumentException("Unsupported split type: " + request.getSplitType());
        }

        return splits;
    }


    @Override
    @Transactional(readOnly = true)
    public Expense getExpenseById(Long expenseId, User currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with ID: " + expenseId));

        Hibernate.initialize(expense.getPayers());
        expense.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
        Hibernate.initialize(expense.getSplits());
        expense.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
        if (expense.getGroup() != null) {
             Hibernate.initialize(expense.getGroup().getMembers());
        }

        boolean isPayer = expense.getPayers().stream().anyMatch(p -> p.getUser().equals(currentUser));
        boolean isOwed = expense.getSplits().stream().anyMatch(s -> s.getOwedBy().equals(currentUser));
        boolean isInGroup = expense.getGroup() != null && expense.getGroup().getMembers().contains(currentUser);

        if (!isPayer && !isOwed && !isInGroup) {
            throw new SecurityException("User not authorized to view this expense.");
        }

        return expense;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Expense> getExpensesForUser(User currentUser) {
        List<ExpensePayer> paidItems = expensePayerRepository.findByUser(currentUser);
        Set<Expense> relatedExpenses = paidItems.stream()
                                                .map(ExpensePayer::getExpense)
                                                .collect(Collectors.toSet());

        List<Split> owedSplits = splitRepository.findByOwedBy(currentUser);
        relatedExpenses.addAll(owedSplits.stream()
                                        .map(Split::getExpense)
                                        .collect(Collectors.toSet()));

        relatedExpenses.forEach(exp -> {
            Hibernate.initialize(exp.getPayers());
            exp.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
            Hibernate.initialize(exp.getSplits());
            exp.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
             if (exp.getGroup() != null) Hibernate.initialize(exp.getGroup());
        });

        return relatedExpenses.stream()
                .sorted(Comparator.comparing(Expense::getDate).reversed())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<Expense> getExpensesForGroup(Long groupId, User currentUser) {
        Group group = groupService.getGroupById(groupId, currentUser);
        List<Expense> expenses = expenseRepository.findByGroup(group);

         expenses.forEach(exp -> {
            Hibernate.initialize(exp.getPayers());
            exp.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
            Hibernate.initialize(exp.getSplits());
            exp.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
        });

        return expenses.stream()
                .sorted(Comparator.comparing(Expense::getDate).reversed())
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public Expense updateExpense(Long expenseId, ExpenseCreateRequest request, MultipartFile receiptFile, User currentUser) {
        logger.info("Attempting to update expense with ID: {}", expenseId);

        final Expense expenseToUpdate = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with ID: " + expenseId));

        Hibernate.initialize(expenseToUpdate.getPayers());
        Hibernate.initialize(expenseToUpdate.getSplits());
        Group originalGroup = expenseToUpdate.getGroup();
        if (originalGroup != null) {
            Hibernate.initialize(originalGroup.getMembers());
        }

        // Authorization Check
        boolean isPayer = expenseToUpdate.getPayers().stream().anyMatch(p -> p.getUser().equals(currentUser));
        boolean isOwed = expenseToUpdate.getSplits().stream().anyMatch(s -> s.getOwedBy().equals(currentUser));
        boolean isInGroup = originalGroup != null && originalGroup.getMembers().contains(currentUser);
        if (!isPayer && !isOwed && !isInGroup) {
            throw new SecurityException("User not authorized to update this expense.");
        }

        // --- Start Update ---
        expenseToUpdate.setDescription(request.getDescription());
        expenseToUpdate.setAmount(request.getAmount().setScale(MONETARY_SCALE, RoundingMode.HALF_UP));
        expenseToUpdate.setDate(request.getDate() != null ? request.getDate() : LocalDate.now());
        expenseToUpdate.setCurrency(request.getCurrency() != null ? request.getCurrency().toUpperCase() : "USD");
        expenseToUpdate.setSplitType(request.getSplitType());
        expenseToUpdate.setNotes(request.getNotes());

        // Group change handling (disallowed)
        Group groupForValidation = expenseToUpdate.getGroup();
        // ... (group validation logic remains the same)

        // Handle Receipt File Update
        String oldReceiptKey = extractKeyFromUrl(expenseToUpdate.getReceiptUrl());
        String newReceiptUrl = expenseToUpdate.getReceiptUrl(); // Keep old URL by default

        if (receiptFile != null && !receiptFile.isEmpty()) {
            logger.info("Processing updated receipt file: {}", receiptFile.getOriginalFilename());
            newReceiptUrl = uploadReceipt(receiptFile); // Upload new file
            if (newReceiptUrl != null && oldReceiptKey != null && !oldReceiptKey.equals(extractKeyFromUrl(newReceiptUrl))) {
                // Delete old file only if upload was successful and key is different
                deleteReceipt(oldReceiptKey);
            }
        }
        expenseToUpdate.setReceiptUrl(newReceiptUrl); // Update URL on entity


        // --- Re-calculate Payers and Splits ---
        logger.debug("Clearing old payers and splits for expense ID: {}", expenseId);
        expenseToUpdate.getPayers().clear();
        expenseToUpdate.getSplits().clear();
        expensePayerRepository.deleteByExpenseId(expenseId);
        splitRepository.deleteByExpenseId(expenseId);

        Map<Long, User> payerUsers = validateAndFetchPayerUsers(request.getPayers(), groupForValidation);
        validatePayerAmounts(request.getPayers(), expenseToUpdate.getAmount());
        Set<ExpensePayer> newPayers = createExpensePayers(request.getPayers(), payerUsers, expenseToUpdate);
        newPayers.forEach(expenseToUpdate::addPayer);

        Map<Long, User> splitUsers = validateAndFetchSplitUsers(request.getSplits(), groupForValidation);
        Set<Split> newSplits = calculateSplits(request, splitUsers, expenseToUpdate.getAmount());
        newSplits.forEach(expenseToUpdate::addSplit);

        Expense savedExpense = expenseRepository.save(expenseToUpdate);
        logger.info("Expense {} updated successfully.", savedExpense.getId());

        return savedExpense;
    }


    @Override
    @Transactional
    public void deleteExpense(Long expenseId, User currentUser) {
        Expense expense = expenseRepository.findById(expenseId)
                .orElseThrow(() -> new RuntimeException("Expense not found with ID: " + expenseId));

        Hibernate.initialize(expense.getPayers());
        expense.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
        if (expense.getGroup() != null) {
             Hibernate.initialize(expense.getGroup().getMembers());
        }

        boolean currentUserIsOriginalPayer = expense.getPayers().stream()
                                                .anyMatch(p -> p.getUser().equals(currentUser));
        boolean currentUserInGroup = expense.getGroup() != null && expense.getGroup().getMembers().contains(currentUser);

         if (!currentUserIsOriginalPayer && !currentUserInGroup && expense.getGroup() != null) {
             throw new SecurityException("Only original payers or group members can delete this group expense.");
        }
         if (!currentUserIsOriginalPayer && expense.getGroup() == null) {
             throw new SecurityException("Only original payers can delete this non-group expense.");
         }

        // Delete receipt from R2 before deleting expense from DB
        String receiptKey = extractKeyFromUrl(expense.getReceiptUrl());
        if (receiptKey != null) {
            deleteReceipt(receiptKey);
        }

        logger.info("Deleting expense ID: {}", expenseId);
        expenseRepository.delete(expense);

        logger.warn("Balance updates for deleted expense {} are handled dynamically.", expenseId);
    }

    // --- R2 Helper Methods ---

    private String uploadReceipt(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = StringUtils.cleanPath(file.getOriginalFilename());
        String fileExtension = StringUtils.getFilenameExtension(originalFilename);
        String uniqueKey = "receipts/" + UUID.randomUUID().toString() + (fileExtension != null ? "." + fileExtension : "");

        try {
            PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                    .bucket(r2BucketName)
                    .key(uniqueKey)
                    .contentType(file.getContentType()) // Set content type
                    // .acl(ObjectCannedACL.PUBLIC_READ) // Optional: if you want public read access
                    .build();

            s3Client.putObject(putObjectRequest, RequestBody.fromInputStream(file.getInputStream(), file.getSize()));

            logger.info("Successfully uploaded receipt '{}' to R2 bucket '{}' with key '{}'", originalFilename, r2BucketName, uniqueKey);

            // Construct the public URL using the r2.public.url.base property
            if (r2PublicUrlBase == null || r2PublicUrlBase.isBlank()) {
                logger.error("R2 Public URL Base (r2.public.url.base) is not configured. Cannot generate public receipt URL.");
                // Fallback or throw error - returning null for now
                return null;
            }
            // Ensure base URL doesn't have trailing slash and key doesn't have leading slash
            String cleanBaseUrl = r2PublicUrlBase.endsWith("/") ? r2PublicUrlBase.substring(0, r2PublicUrlBase.length() - 1) : r2PublicUrlBase;
            String cleanKey = uniqueKey.startsWith("/") ? uniqueKey.substring(1) : uniqueKey;

            String publicUrl = cleanBaseUrl + "/" + cleanKey;
            logger.debug("Generated public receipt URL: {}", publicUrl);
            return publicUrl;


        } catch (IOException e) {
            logger.error("Could not read receipt file input stream: {}", e.getMessage());
            throw new RuntimeException("Failed to read receipt file.", e);
        } catch (S3Exception e) {
            logger.error("Error uploading receipt to R2: {} (AWS Error Code: {})", e.getMessage(), e.awsErrorDetails().errorCode());
            throw new RuntimeException("Failed to upload receipt to storage.", e);
        } catch (SdkException e) {
             logger.error("AWS SDK error during receipt upload: {}", e.getMessage());
             throw new RuntimeException("Failed to upload receipt due to SDK error.", e);
        }
    }

     private void deleteReceipt(String key) {
        if (key == null || key.isBlank()) {
            return;
        }
        try {
            DeleteObjectRequest deleteObjectRequest = DeleteObjectRequest.builder()
                    .bucket(r2BucketName)
                    .key(key)
                    .build();
            s3Client.deleteObject(deleteObjectRequest);
            logger.info("Successfully deleted receipt with key '{}' from R2 bucket '{}'", key, r2BucketName);
        } catch (S3Exception e) {
            logger.error("Error deleting receipt key '{}' from R2: {} (AWS Error Code: {})", key, e.getMessage(), e.awsErrorDetails().errorCode());
            // Decide if this should throw an exception or just log
        } catch (SdkException e) {
             logger.error("AWS SDK error during receipt deletion for key '{}': {}", key, e.getMessage());
        }
    }

    // Helper to extract the object key from a potential R2 URL
    private String extractKeyFromUrl(String url) {
        if (url == null || url.isBlank() || r2EndpointUrl == null || r2BucketName == null) {
            return null;
        }
         // Basic extraction assuming URL format like:
         // https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>/<KEY>
         // or https://<BUCKET>.<ACCOUNT_ID>.r2.cloudflarestorage.com/<KEY> (if using virtual host style)
         // Or custom domain: https://<CUSTOM_DOMAIN>/<KEY>

         // Let's try a simple path-based extraction first
         String prefix = "/" + r2BucketName + "/";
         int keyIndex = url.indexOf(prefix);
         if (keyIndex != -1) {
             return url.substring(keyIndex + prefix.length());
         }

         // Add more robust extraction logic if needed based on your exact URL format
         logger.warn("Could not reliably extract R2 key from URL: {}", url);
         return null;
    }

}