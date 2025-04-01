import apiClient from './api';
import { GroupCreateRequest, GroupResponseDto, AddMemberRequest, TransactionDto } from '../types/api';

// Fetches all groups for the current user
export const getMyGroups = async (): Promise<GroupResponseDto[]> => {
  try {
    const response = await apiClient.get<GroupResponseDto[]>('/groups/my');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || new Error('Failed to fetch groups');
  }
};

// Creates a new group
export const createGroup = async (groupData: GroupCreateRequest): Promise<GroupResponseDto> => {
    try {
        const response = await apiClient.post<GroupResponseDto>('/groups', groupData);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to create group');
    }
};

// Fetches details for a specific group
export const getGroupDetails = async (groupId: number): Promise<GroupResponseDto> => {
    try {
        const response = await apiClient.get<GroupResponseDto>(`/groups/${groupId}`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to fetch details for group ${groupId}`);
    }
};

// Adds a member to a group
export const addMemberToGroup = async (groupId: number, memberData: AddMemberRequest): Promise<GroupResponseDto> => {
    try {
        const response = await apiClient.post<GroupResponseDto>(`/groups/${groupId}/members`, memberData);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to add member to group ${groupId}`);
    }
};

// Fetches transactions (expenses and payments) for a specific group
export const getGroupTransactions = async (groupId: number): Promise<TransactionDto[]> => {
    try {
        const response = await apiClient.get<TransactionDto[]>(`/groups/${groupId}/transactions`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to fetch transactions for group ${groupId}`);
    }
};

// Leaves a group (removes the current user)
export const leaveGroup = async (groupId: number, userId: number): Promise<void> => {
    try {
        await apiClient.delete(`/groups/${groupId}/members/${userId}`);
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to leave group ${groupId}`);
    }
};

// Deletes a group
export const deleteGroup = async (groupId: number): Promise<void> => {
    try {
        await apiClient.delete(`/groups/${groupId}`);
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to delete group ${groupId}`);
    }
};