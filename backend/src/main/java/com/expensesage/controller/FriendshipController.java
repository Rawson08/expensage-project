package com.expensesage.controller;

import java.util.List;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.FriendRequestDto;
import com.expensesage.dto.FriendshipResponseDto;
import com.expensesage.mapper.FriendshipMapper;
import com.expensesage.mapper.UserMapper;
import com.expensesage.model.Friendship;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.FriendshipService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/friendships")
@PreAuthorize("isAuthenticated()") // All friendship actions require authentication
public class FriendshipController {

    private static final Logger logger = LoggerFactory.getLogger(FriendshipController.class);

    private final FriendshipService friendshipService;
    private final UserRepository userRepository;
    private final FriendshipMapper friendshipMapper;
    private final UserMapper userMapper; // To map User lists

    @Autowired
    public FriendshipController(FriendshipService friendshipService, UserRepository userRepository, FriendshipMapper friendshipMapper, UserMapper userMapper) {
        this.friendshipService = friendshipService;
        this.userRepository = userRepository;
        this.friendshipMapper = friendshipMapper;
        this.userMapper = userMapper;
    }

    // Helper method to get current authenticated user
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
        return userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Authenticated user not found in database"));
    }

    // Send a friend request
    @PostMapping("/requests")
    public ResponseEntity<FriendshipResponseDto> sendFriendRequest(@Valid @RequestBody FriendRequestDto request) {
        try {
            User currentUser = getCurrentUser();
            Friendship friendship = friendshipService.sendFriendRequest(currentUser, request.getRecipientEmail());

            if (friendship != null) {
                // Friend request created successfully
                return ResponseEntity.status(HttpStatus.CREATED).body(friendshipMapper.toFriendshipResponseDto(friendship, currentUser));
            } else {
                // Invitation email sent (user didn't exist)
                return ResponseEntity.accepted().build(); // Return 202 Accepted
            }
        } catch (RuntimeException e) { // Catch RuntimeException (includes IllegalArgumentException)
            logger.warn("Failed to send friend request: {}", e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // Accept a friend request
    @PutMapping("/requests/{friendshipId}/accept")
    public ResponseEntity<FriendshipResponseDto> acceptFriendRequest(@PathVariable Long friendshipId) {
         try {
            User currentUser = getCurrentUser();
            Friendship friendship = friendshipService.acceptFriendRequest(friendshipId, currentUser);
            return ResponseEntity.ok(friendshipMapper.toFriendshipResponseDto(friendship, currentUser));
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            logger.warn("Failed to accept friend request {}: {}", friendshipId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // Reject a friend request
    @PutMapping("/requests/{friendshipId}/reject")
    public ResponseEntity<Void> rejectFriendRequest(@PathVariable Long friendshipId) {
         try {
            User currentUser = getCurrentUser();
            friendshipService.rejectFriendRequest(friendshipId, currentUser); // Service now deletes on reject
            return ResponseEntity.noContent().build(); // Return 204 No Content
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            logger.warn("Failed to reject friend request {}: {}", friendshipId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // Remove a friend (unfriend)
    @DeleteMapping("/{friendshipId}")
    public ResponseEntity<Void> removeFriendship(@PathVariable Long friendshipId) {
         try {
            User currentUser = getCurrentUser();
            friendshipService.removeFriendship(friendshipId, currentUser);
            return ResponseEntity.noContent().build(); // Return 204 No Content
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            logger.warn("Failed to remove friendship {}: {}", friendshipId, e.getMessage());
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage()); // Or BAD_REQUEST
        }
    }

    // Get list of friends (returns Friendship details including the other user)
    @GetMapping("/friends")
    public ResponseEntity<List<FriendshipResponseDto>> getFriends() {
        User currentUser = getCurrentUser();
        List<Friendship> friendships = friendshipService.getFriends(currentUser); // Service now returns Friendships
        // Map Friendship entities to DTOs
        List<FriendshipResponseDto> responseDtos = friendships.stream()
                .map(f -> friendshipMapper.toFriendshipResponseDto(f, currentUser))
                .collect(Collectors.toList());
        return ResponseEntity.ok(responseDtos);
    }

    // Get list of incoming pending requests
    @GetMapping("/requests/incoming")
    public ResponseEntity<List<FriendshipResponseDto>> getIncomingRequests() {
        User currentUser = getCurrentUser();
        List<Friendship> requests = friendshipService.getPendingIncomingRequests(currentUser);
        return ResponseEntity.ok(requests.stream().map(f -> friendshipMapper.toFriendshipResponseDto(f, currentUser)).collect(Collectors.toList()));
    }

    // Get list of outgoing pending requests
    @GetMapping("/requests/outgoing")
    public ResponseEntity<List<FriendshipResponseDto>> getOutgoingRequests() {
        User currentUser = getCurrentUser();
        List<Friendship> requests = friendshipService.getPendingOutgoingRequests(currentUser);
        return ResponseEntity.ok(requests.stream().map(f -> friendshipMapper.toFriendshipResponseDto(f, currentUser)).collect(Collectors.toList()));
    }
}