package com.expensesage.service;

import java.util.List;
import java.util.Set;

import com.expensesage.dto.GroupSettingsUpdateRequest; // Added
import com.expensesage.model.Group;
import com.expensesage.model.User;

public interface GroupService {

    /**
     * Creates a new group.
     *
     * @param groupName The name for the new group.
     * @param creator   The user creating the group (will be added as the first
     *                  member).
     * @return The newly created Group entity.
     */
    Group createGroup(String groupName, User creator);

    /**
     * Adds a member to an existing group. If the user doesn't exist,
     * creates a new user account (basic implementation).
     *
     * @param groupId          The ID of the group to add the member to.
     * @param addMemberRequest DTO containing member's email and name.
     * @param currentUser      The user performing the action (should ideally be a member or admin).
     * @return The updated Group entity.
     * @throws RuntimeException if group not found, user already in group, or permission denied.
     */
    Group addMemberToGroup(Long groupId, com.expensesage.dto.AddMemberRequest addMemberRequest, User currentUser); // Updated parameter

    /**
    /**
     * Removes a member from a group.
     *
     * @param groupId     The ID of the group.
     * @param memberId    The ID of the member to remove.
     * @param currentUser The user performing the action.
     * @return The updated Group entity.
     * @throws RuntimeException if group or member not found, member not in group,
     *                          or permission denied.
     */
    Group removeMemberFromGroup(Long groupId, Long memberId, User currentUser);

    /**
     * Retrieves a group by its ID, ensuring the current user is a member.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the group details.
     * @return The Group entity.
     * @throws RuntimeException if group not found or user is not a member.
     */
    Group getGroupById(Long groupId, User currentUser);

    /**
     * Retrieves all groups the current user is a member of.
     *
     * @param currentUser The user whose groups to retrieve.
     * @return A list of Group entities.
     */
    List<Group> getGroupsForUser(User currentUser);

    /**
     * Retrieves the members of a specific group.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the members list (must be a member).
     * @return A set of User entities who are members of the group.
     * @throws RuntimeException if group not found or user is not a member.
     */
    Set<User> getGroupMembers(Long groupId, User currentUser);

    /**
     * Deletes a group.
     *
     * @param groupId     The ID of the group to delete.
     * @param currentUser The user attempting to delete the group (should be the creator).
     * @throws RuntimeException if group not found or user is not the creator.
     */
    void deleteGroup(Long groupId, User currentUser);

    /**
     * Retrieves all transactions (expenses and payments) associated with a specific group.
     *
     * @param groupId     The ID of the group.
     * @param currentUser The user requesting the transactions (must be a member).
     * @return A list of TransactionDto objects, sorted by date descending.
     * @throws RuntimeException if group not found or user is not a member.
     */
    List<com.expensesage.dto.TransactionDto> getGroupTransactions(Long groupId, User currentUser); // Added method
 
    /**
     * Updates the settings for a specific group.
     * Currently only supports toggling debt simplification.
     *
     * @param groupId     The ID of the group to update.
     * @param settingsDto The DTO containing the settings to update.
     * @param currentUser The user performing the action (must be the group creator).
     * @return The updated Group entity.
     * @throws RuntimeException if group not found or user is not the creator.
     */
    Group updateGroupSettings(Long groupId, GroupSettingsUpdateRequest settingsDto, User currentUser);
}