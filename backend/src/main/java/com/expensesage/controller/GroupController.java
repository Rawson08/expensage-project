package com.expensesage.controller;

import java.util.List;
import java.util.Set;

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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.expensesage.dto.AddMemberRequest;
import com.expensesage.dto.GroupCreateRequest;
import com.expensesage.dto.GroupResponseDto;
import com.expensesage.dto.TransactionDto;
import com.expensesage.dto.UserResponse;
import com.expensesage.mapper.GroupMapper;
import com.expensesage.model.Group;
import com.expensesage.model.User;
import com.expensesage.repository.UserRepository;
import com.expensesage.security.services.UserDetailsImpl;
import com.expensesage.service.GroupService;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService groupService;
    private final GroupMapper groupMapper;
    private final UserRepository userRepository;

    @Autowired
    public GroupController(GroupService groupService, GroupMapper groupMapper, UserRepository userRepository) {
        this.groupService = groupService;
        this.groupMapper = groupMapper;
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
    public ResponseEntity<GroupResponseDto> createGroup(@Valid @RequestBody GroupCreateRequest request) {
        try {
            User currentUser = getCurrentUser();
            Group newGroup = groupService.createGroup(request.getName(), currentUser);
            return ResponseEntity.status(HttpStatus.CREATED).body(groupMapper.toGroupResponseDto(newGroup));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    // --- Moved /my before /{groupId} ---
    @GetMapping("/my") // Changed path from root to /my
    public ResponseEntity<List<GroupResponseDto>> getMyGroups() {
        User currentUser = getCurrentUser();
        List<Group> groups = groupService.getGroupsForUser(currentUser);
        return ResponseEntity.ok(groupMapper.toGroupResponseDtoList(groups));
    }

    @GetMapping("/{groupId}")
    public ResponseEntity<GroupResponseDto> getGroupDetails(@PathVariable Long groupId) {
        try {
            User currentUser = getCurrentUser();
            Group group = groupService.getGroupById(groupId, currentUser);
            // Ensure user is a member before returning details (service might handle this, but double-check)
             if (!group.getMembers().contains(currentUser)) {
                 throw new SecurityException("User is not a member of this group.");
             }
            return ResponseEntity.ok(groupMapper.toGroupResponseDto(group));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/{groupId}/members")
    public ResponseEntity<Set<UserResponse>> getGroupMembers(@PathVariable Long groupId) {
        try {
            User currentUser = getCurrentUser();
            Set<User> members = groupService.getGroupMembers(groupId, currentUser);
            return ResponseEntity.ok(groupMapper.toUserResponseSet(members));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @PostMapping("/{groupId}/members")
    public ResponseEntity<GroupResponseDto> addMember(@PathVariable Long groupId,
            @Valid @RequestBody AddMemberRequest request) {
        try {
            User currentUser = getCurrentUser();
            Group updatedGroup = groupService.addMemberToGroup(groupId, request, currentUser);
            return ResponseEntity.ok(groupMapper.toGroupResponseDto(updatedGroup));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{groupId}/members/{memberId}")
    public ResponseEntity<GroupResponseDto> removeMember(@PathVariable Long groupId, @PathVariable Long memberId) {
        try {
            User currentUser = getCurrentUser();
            Group updatedGroup = groupService.removeMemberFromGroup(groupId, memberId, currentUser);
            return ResponseEntity.ok(groupMapper.toGroupResponseDto(updatedGroup));
        } catch (SecurityException e) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, e.getMessage());
        }
    }

    @DeleteMapping("/{groupId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long groupId) {
        try {
            User currentUser = getCurrentUser();
            groupService.deleteGroup(groupId, currentUser);
            return ResponseEntity.noContent().build();
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
             throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }

    @GetMapping("/{groupId}/transactions")
    public ResponseEntity<List<TransactionDto>> getGroupTransactions(@PathVariable Long groupId) {
         User currentUser = getCurrentUser();
         try {
            List<TransactionDto> transactions = groupService.getGroupTransactions(groupId, currentUser);
            return ResponseEntity.ok(transactions);
        } catch (SecurityException e) {
             throw new ResponseStatusException(HttpStatus.FORBIDDEN, e.getMessage());
        } catch (RuntimeException e) {
             throw new ResponseStatusException(HttpStatus.NOT_FOUND, e.getMessage());
        }
    }
}