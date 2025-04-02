package com.expensesage.service.impl;

import java.util.Comparator; // Added
import java.util.HashSet; // Added
import java.util.List; // Added
import java.util.Optional; // Added
import java.util.Set; // Added
import java.util.stream.Collectors; // Added
import java.util.stream.Stream; // Added

import org.hibernate.Hibernate; // Added
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Lazy; // Added import
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.AddMemberRequest;
import com.expensesage.dto.GroupSettingsUpdateRequest; // Added
import com.expensesage.dto.TransactionDto; // Added
import com.expensesage.mapper.ExpenseMapper; // Added
import com.expensesage.mapper.PaymentMapper;
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.Expense;
import com.expensesage.model.Friendship;
import com.expensesage.model.Friendship.FriendshipStatus;
import com.expensesage.model.Group;
import com.expensesage.model.Payment;
import com.expensesage.model.User; // Added
import com.expensesage.repository.ExpenseRepository; // Added
import com.expensesage.repository.FriendshipRepository; // Added
import com.expensesage.repository.GroupRepository; // Added
import com.expensesage.repository.PaymentRepository; // Added
import com.expensesage.repository.UserRepository; // Added
import com.expensesage.service.BalanceService; // Added
import com.expensesage.service.GroupService;

@Service
public class GroupServiceImpl implements GroupService {

    private static final Logger logger = LoggerFactory.getLogger(GroupServiceImpl.class);

    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final FriendshipRepository friendshipRepository;
    private final ExpenseRepository expenseRepository; // Added
    private final PaymentRepository paymentRepository; // Added
    private final ExpenseMapper expenseMapper;
    private final PaymentMapper paymentMapper;
    private final UserMapper userMapper;
    private final BalanceService balanceService; // Added BalanceService field

    @Value("${expensesage.app.frontend.url:http://localhost:5173}")
    private String frontendUrlBase;


    @Autowired
    public GroupServiceImpl(GroupRepository groupRepository,
                            UserRepository userRepository,
                            FriendshipRepository friendshipRepository,
                            ExpenseRepository expenseRepository,
                            PaymentRepository paymentRepository,
                            ExpenseMapper expenseMapper,
                            PaymentMapper paymentMapper,
                            UserMapper userMapper,
                            @Lazy BalanceService balanceService // Added @Lazy annotation
                            ) {
        this.groupRepository = groupRepository;
        this.userRepository = userRepository;
        this.friendshipRepository = friendshipRepository;
        this.expenseRepository = expenseRepository;
        this.paymentRepository = paymentRepository;
        this.expenseMapper = expenseMapper;
        this.paymentMapper = paymentMapper;
        this.userMapper = userMapper;
        this.balanceService = balanceService; // Added BalanceService assignment
    }

    @Override
    @Transactional
    public Group createGroup(String groupName, User creator) {
        if (groupName == null || groupName.trim().isEmpty()) {
            throw new IllegalArgumentException("Group name cannot be empty.");
        }
        Group group = new Group();
        group.setName(groupName.trim());
        group.setCreator(creator);
        group.setMembers(new HashSet<>());
        group.getMembers().add(creator);
        return groupRepository.save(group);
    }

    @Override
    @Transactional
    public Group addMemberToGroup(Long groupId, AddMemberRequest addMemberRequest, User currentUser) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found with ID: " + groupId));

        String memberEmail = addMemberRequest.getMemberEmail();

        User memberToAdd = userRepository.findByEmail(memberEmail)
                .orElseThrow(() -> new RuntimeException("User with email " + memberEmail + " not found. Please send them a friend request first."));

        Optional<Friendship> friendshipOpt = friendshipRepository.findFriendshipBetweenUsers(currentUser, memberToAdd);
        if (friendshipOpt.isEmpty() || friendshipOpt.get().getStatus() != FriendshipStatus.ACCEPTED) {
             throw new RuntimeException("You must be friends with " + memberToAdd.getName() + " before adding them to a group.");
        }

        if (group.getMembers().contains(memberToAdd)) {
            throw new RuntimeException("User is already a member of this group.");
        }

        group.addMember(memberToAdd);
        logger.info("Added friend {} to group {}", memberEmail, group.getName());
        return groupRepository.save(group);

    }


    @Override
    @Transactional
    public Group removeMemberFromGroup(Long groupId, Long memberId, User currentUser) {
        Group group = getGroupById(groupId, currentUser);

        User memberToRemove = userRepository.findById(memberId)
                .orElseThrow(() -> new RuntimeException("User to remove not found with ID: " + memberId));

        // Check balances ONLY if the current user is trying to remove themselves (leaving the group)
        if (currentUser.equals(memberToRemove)) {
            logger.info("User {} is attempting to leave group {}. Checking balances...", currentUser.getId(), groupId);
            // Need to import BalanceDto if not already imported
            List<com.expensesage.dto.BalanceDto> groupBalances = balanceService.getGroupBalances(currentUser, groupId);
            if (!groupBalances.isEmpty()) {
                logger.warn("User {} cannot leave group {} due to outstanding balances.", currentUser.getId(), groupId);
                throw new RuntimeException("Cannot leave group with outstanding balances. Settle debts first.");
            }
            logger.info("User {} has no outstanding balances in group {}. Proceeding with removal.", currentUser.getId(), groupId);
        }

        if (group.getMembers().size() <= 1 && group.getMembers().contains(memberToRemove)) {
             throw new RuntimeException("Cannot remove the last member of the group.");
        }

        if (!group.getMembers().contains(memberToRemove)) {
            throw new RuntimeException("User is not a member of this group.");
        }

        if (!currentUser.equals(group.getCreator()) && !currentUser.equals(memberToRemove)) {
             throw new SecurityException("Only the group creator or the member themselves can remove a member.");
        }
        if (currentUser.equals(group.getCreator()) && currentUser.equals(memberToRemove) && group.getMembers().size() <= 1) {
             throw new RuntimeException("Creator cannot remove themselves as the last member.");
        }


        group.removeMember(memberToRemove);
        logger.info("Removed user {} from group {}", memberToRemove.getEmail(), group.getName());
        return groupRepository.save(group);
    }

    @Override
    @Transactional(readOnly = true)
    public Group getGroupById(Long groupId, User currentUser) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found with ID: " + groupId));

        Hibernate.initialize(group.getMembers()); // Eager fetch members

        // Allow any authenticated user to fetch basic group details by ID
        // Specific checks for actions (like adding members, viewing balances) happen elsewhere
        return group;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Group> getGroupsForUser(User currentUser) {
        List<Group> groups = groupRepository.findByMembersContains(currentUser);
        // Eager fetch members for each group
        groups.forEach(g -> Hibernate.initialize(g.getMembers()));
        return groups;
    }

    @Override
    @Transactional(readOnly = true)
    public Set<User> getGroupMembers(Long groupId, User currentUser) {
        Group group = getGroupById(groupId, currentUser);
         if (!group.getMembers().contains(currentUser)) {
            throw new SecurityException("You must be a member of this group to view its members.");
        }
        return group.getMembers();
    }

    @Override
    @Transactional
    public void deleteGroup(Long groupId, User currentUser) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found with ID: " + groupId));

        Hibernate.initialize(group.getCreator()); // Ensure creator is fetched

        if (!group.getCreator().equals(currentUser)) {
            throw new SecurityException("Only the group creator can delete the group.");
        }

        // Check for outstanding balances within the group
        logger.info("Checking balances before deleting group {}", groupId);
        Hibernate.initialize(group.getMembers()); // Ensure members are loaded
        for (User member : group.getMembers()) {
            // Need to import BalanceDto if not already imported
            List<com.expensesage.dto.BalanceDto> memberBalances = balanceService.getGroupBalances(member, groupId);
            if (!memberBalances.isEmpty()) {
                logger.warn("Cannot delete group {} because member {} has outstanding balances.", groupId, member.getId());
                throw new RuntimeException("Cannot delete group with outstanding balances. All members must be settled up first.");
            }
        }
        logger.info("No outstanding balances found in group {}. Proceeding with deletion.", groupId);

        logger.info("Deleting group '{}' (ID: {}) requested by creator {}", group.getName(), groupId, currentUser.getEmail());
        groupRepository.delete(group);
        logger.info("Group {} deleted successfully.", groupId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TransactionDto> getGroupTransactions(Long groupId, User currentUser) {
        logger.info("Fetching transactions for group {} for user {}", groupId, currentUser.getId());
        Group group = getGroupById(groupId, currentUser); // Ensures user is member

        // Fetch expenses and payments associated with the group
        List<Expense> expenses = expenseRepository.findByGroup(group);
        List<Payment> payments = paymentRepository.findByGroup(group);

        // Eager fetch necessary details for mapping
        expenses.forEach(exp -> {
            Hibernate.initialize(exp.getPayers());
            exp.getPayers().forEach(p -> Hibernate.initialize(p.getUser()));
            Hibernate.initialize(exp.getSplits());
            exp.getSplits().forEach(s -> Hibernate.initialize(s.getOwedBy()));
        });
        payments.forEach(pay -> {
            Hibernate.initialize(pay.getPaidBy());
            Hibernate.initialize(pay.getPaidTo());
        });

        // Map Expenses to TransactionDto
        List<TransactionDto> expenseTransactions = expenses.stream()
            .map(expense -> TransactionDto.builder()
                .id(expense.getId())
                .type("expense")
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .currency(expense.getCurrency())
                .date(expense.getDate())
                .createdAt(expense.getCreatedAt())
                .payers(expenseMapper.toPayerResponseDtoList(expense.getPayers())) // Use ExpenseMapper
                .splits(expenseMapper.toSplitResponseDtoList(expense.getSplits())) // Use ExpenseMapper
                .notes(expense.getNotes()) // Added notes mapping
                .receiptUrl(expense.getReceiptUrl()) // Added receiptUrl mapping
                .build())
            .collect(Collectors.toList());

        // Map Payments to TransactionDto
        List<TransactionDto> paymentTransactions = payments.stream()
            .map(payment -> TransactionDto.builder()
                .id(payment.getId())
                .type("payment")
                .description(String.format("%s paid %s", payment.getPaidBy().getName(), payment.getPaidTo().getName())) // Generate description
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .date(payment.getDate())
                .createdAt(payment.getCreatedAt())
                .paidBy(userMapper.toUserResponse(payment.getPaidBy())) // Use UserMapper
                .paidTo(userMapper.toUserResponse(payment.getPaidTo())) // Use UserMapper
                .build())
            .collect(Collectors.toList());

        // Combine and sort by createdAt descending (most recent first)
        List<TransactionDto> combinedTransactions = Stream.concat(expenseTransactions.stream(), paymentTransactions.stream())
            .sorted(Comparator.comparing(TransactionDto::getCreatedAt).reversed())
            .collect(Collectors.toList());

        logger.info("Returning {} combined transactions for group {}", combinedTransactions.size(), groupId);
        return combinedTransactions;
    }
 
    @Override
    @Transactional
    public Group updateGroupSettings(Long groupId, GroupSettingsUpdateRequest settingsDto, User currentUser) {
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found with ID: " + groupId));
 
        // Authorization: Only the creator can change settings
        Hibernate.initialize(group.getCreator()); // Ensure creator is loaded
        if (!group.getCreator().equals(currentUser)) {
            logger.warn("User {} attempted to change settings for group ID {} owned by {}", currentUser.getEmail(), groupId, group.getCreator().getEmail());
            throw new org.springframework.security.access.AccessDeniedException("Only the group creator can change group settings.");
        }
 
        group.setSimplifyDebts(settingsDto.getSimplifyDebts());
        Group updatedGroup = groupRepository.save(group);
        logger.info("User {} updated settings for group ID {}. Simplify debts set to: {}", currentUser.getEmail(), groupId, updatedGroup.isSimplifyDebts());
        
        // Eager fetch members before returning, as the caller might need them
        Hibernate.initialize(updatedGroup.getMembers());
        return updatedGroup;
    }
}