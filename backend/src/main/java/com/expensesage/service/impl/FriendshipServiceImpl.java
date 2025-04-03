package com.expensesage.service.impl;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.HashMap; // Import HashMap

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired; // Ensure HashSet is imported
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.expensesage.dto.BalanceDto;
import com.expensesage.model.Friendship;
import com.expensesage.model.Friendship.FriendshipStatus;
import com.expensesage.model.User; // Ensure BalanceDto is imported
import com.expensesage.repository.FriendshipRepository;
import com.expensesage.repository.UserRepository;
import com.expensesage.service.BalanceService;
import com.expensesage.service.EmailService;
import com.expensesage.service.FriendshipService;
import com.expensesage.service.NotificationService; // Import NotificationService

@Service
public class FriendshipServiceImpl implements FriendshipService {

    private static final Logger logger = LoggerFactory.getLogger(FriendshipServiceImpl.class);

    private final FriendshipRepository friendshipRepository;
    private final UserRepository userRepository;
    private final BalanceService balanceService;
    private final EmailService emailService;
    private final NotificationService notificationService; // Add NotificationService field
  
    @Autowired
    public FriendshipServiceImpl(FriendshipRepository friendshipRepository,
                                 UserRepository userRepository,
                                 BalanceService balanceService,
                                 EmailService emailService,
                                 NotificationService notificationService) { // Inject NotificationService
        this.friendshipRepository = friendshipRepository;
        this.userRepository = userRepository;
        this.balanceService = balanceService;
        this.emailService = emailService;
        this.notificationService = notificationService; // Assign NotificationService
    }

    @Override
    @Transactional
    public Friendship sendFriendRequest(User requester, String recipientEmail) {
        if (requester.getEmail().equalsIgnoreCase(recipientEmail)) {
            throw new IllegalArgumentException("Cannot send a friend request to yourself.");
        }

        Optional<User> recipientOpt = userRepository.findByEmail(recipientEmail);

        if (recipientOpt.isPresent()) {
            // User exists, proceed with friend request logic
            User recipient = recipientOpt.get();
            Optional<Friendship> existingFriendship = friendshipRepository.findFriendshipBetweenUsers(requester, recipient);
            if (existingFriendship.isPresent()) {
                Friendship fs = existingFriendship.get();
                if (fs.getStatus() == FriendshipStatus.ACCEPTED) {
                    throw new RuntimeException("You are already friends with this user.");
                } else if (fs.getStatus() == FriendshipStatus.PENDING) {
                    if (fs.getActionUserId() != null && fs.getActionUserId().equals(requester.getId())) {
                        throw new RuntimeException("Friend request already sent to this user.");
                    } else {
                        throw new RuntimeException("This user has already sent you a friend request.");
                    }
                }
            }

            Friendship newRequest = new Friendship();
            newRequest.setUser1(requester);
            newRequest.setUser2(recipient);
            newRequest.setStatus(FriendshipStatus.PENDING);
            newRequest.setActionUserId(requester.getId());

            logger.info("User {} sending friend request to existing user {}", requester.getEmail(), recipientEmail);
            return friendshipRepository.save(newRequest);
        } else {
            // User does not exist, send invitation email
            logger.info("User {} not found. Sending invitation email to {}", recipientEmail, recipientEmail);
            emailService.sendInvitationEmail(recipientEmail, requester); // Assuming this method exists
            return null; // Indicate that an invitation was sent, not a friendship created
        }
    }

    @Override
    @Transactional
    public Friendship acceptFriendRequest(Long friendshipId, User currentUser) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friend request not found."));

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending.");
        }
        if (!friendship.getUser2().equals(currentUser)) {
             throw new SecurityException("You cannot accept this friend request.");
        }
        if (friendship.getActionUserId() != null && friendship.getActionUserId().equals(currentUser.getId())) {
             throw new SecurityException("Cannot accept your own friend request.");
        }

        friendship.setStatus(FriendshipStatus.ACCEPTED);
        friendship.setActionUserId(null); // Clear action user ID
        Friendship savedFriendship = friendshipRepository.save(friendship);
        logger.info("User {} accepted friend request ID {}", currentUser.getEmail(), friendshipId);
      
        // --- Send Notification ---
        try {
            User requester = savedFriendship.getUser1(); // The user who sent the request
            String title = "Friend Request Accepted";
            String body = String.format("%s accepted your friend request!", currentUser.getName());
            // Payload for frontend to navigate on click (e.g., to friends page)
            Map<String, String> payload = new HashMap<>();
            payload.put("type", "friend_request_accepted");
            payload.put("friendId", currentUser.getId().toString()); // ID of the user who accepted
            notificationService.sendNotification(requester, title, body, payload);
        } catch (Exception e) {
            // Log notification error but don't fail the acceptance
            logger.error("Failed to send notification for accepted friend request {}: {}",
                         savedFriendship.getId(), e.getMessage());
        }
      
        return savedFriendship;
    }

    @Override
    @Transactional
    public Friendship rejectFriendRequest(Long friendshipId, User currentUser) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friend request not found."));

        if (friendship.getStatus() != FriendshipStatus.PENDING) {
            throw new RuntimeException("Friend request is not pending.");
        }
        if (!friendship.getUser2().equals(currentUser)) {
             throw new SecurityException("You cannot reject this friend request.");
        }
        if (friendship.getActionUserId() != null && friendship.getActionUserId().equals(currentUser.getId())) {
             throw new SecurityException("Cannot reject your own friend request.");
        }

         logger.info("User {} rejected friend request ID {}. Deleting request.", currentUser.getEmail(), friendshipId);
         friendshipRepository.delete(friendship);
         return friendship;
    }

    @Override
    @Transactional
    public void removeFriendship(Long friendshipId, User currentUser) {
        Friendship friendship = friendshipRepository.findById(friendshipId)
                .orElseThrow(() -> new RuntimeException("Friendship not found."));

        if (friendship.getStatus() != FriendshipStatus.ACCEPTED ||
            (!friendship.getUser1().equals(currentUser) && !friendship.getUser2().equals(currentUser))) {
            throw new SecurityException("You are not part of this friendship or it's not accepted.");
        }

        // Check balance before allowing unfriend
        User otherUser = friendship.getUser1().equals(currentUser) ? friendship.getUser2() : friendship.getUser1();
        BalanceDto balance = balanceService.getBalanceBetweenUsers(currentUser, otherUser);

        // Add detailed logging before the check
        BigDecimal balanceAmount = balance.getNetAmount();
        logger.debug("Checking balance for unfriend: Friendship ID {}, User {}, Other User {}, Balance = {}",
                     friendshipId, currentUser.getId(), otherUser.getId(), balanceAmount);

        BigDecimal zeroThreshold = new BigDecimal("0.005");
        if (balanceAmount.abs().compareTo(zeroThreshold) > 0) {
             logger.warn("User {} attempted to remove friendship ID {} with user {} but balance is not zero ({}). Preventing removal.",
                         currentUser.getEmail(), friendshipId, otherUser.getEmail(), balanceAmount);
             throw new RuntimeException("Cannot remove friend: You still have an outstanding balance with " + otherUser.getName() + ".");
        }


        logger.info("User {} removing friendship ID {}", currentUser.getEmail(), friendshipId);
        friendshipRepository.delete(friendship);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Friendship> getFriends(User currentUser) {
        List<Friendship> friendships = friendshipRepository.findByUserAndStatus(currentUser, FriendshipStatus.ACCEPTED);
        friendships.forEach(f -> {
            f.getUser1();
            f.getUser2();
        });
        return friendships;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Friendship> getPendingIncomingRequests(User currentUser) {
         return friendshipRepository.findByUser2AndStatus(currentUser, FriendshipStatus.PENDING);
    }

     @Override
    @Transactional(readOnly = true)
    public List<Friendship> getPendingOutgoingRequests(User currentUser) {
         return friendshipRepository.findByUser1AndStatus(currentUser, FriendshipStatus.PENDING);
    }
}