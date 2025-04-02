import apiClient from './api';
import { FriendshipResponseDto, FriendRequestDto } from '../types/api';

// Get list of accepted friends
export const getFriends = async (): Promise<FriendshipResponseDto[]> => {
    try {
        const response = await apiClient.get<FriendshipResponseDto[]>('/friendships/friends');
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to fetch friends');
    }
};

// Get incoming friend requests
export const getIncomingRequests = async (): Promise<FriendshipResponseDto[]> => {
    try {
        const response = await apiClient.get<FriendshipResponseDto[]>('/friendships/requests/incoming');
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to fetch incoming requests');
    }
};

// Get outgoing friend requests
export const getOutgoingRequests = async (): Promise<FriendshipResponseDto[]> => {
    try {
        const response = await apiClient.get<FriendshipResponseDto[]>('/friendships/requests/outgoing');
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to fetch outgoing requests');
    }
};

// Send a friend request or trigger an invitation
export const sendFriendRequest = async (recipientEmail: string): Promise<FriendshipResponseDto | null> => {
    try {
        const payload: FriendRequestDto = { recipientEmail };
        // Use full response to check status code
        const response = await apiClient.post<FriendshipResponseDto>('/friendships/requests', payload, { validateStatus: (status) => status >= 200 && status < 300 });

        if (response.status === 201) { // 201 Created: Friend request sent
            return response.data;
        } else if (response.status === 202) { // 202 Accepted: Invitation email sent
            return null; // Indicate invitation was sent
        }
        // Should not happen with validateStatus, but as a fallback
        throw new Error(`Unexpected success status: ${response.status}`);
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to send friend request');
    }
};

// Accept a friend request
export const acceptFriendRequest = async (friendshipId: number): Promise<FriendshipResponseDto> => {
    try {
        const response = await apiClient.put<FriendshipResponseDto>(`/friendships/requests/${friendshipId}/accept`);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to accept friend request');
    }
};

// Reject (delete) a friend request
export const rejectFriendRequest = async (friendshipId: number): Promise<void> => {
    try {
        await apiClient.put(`/friendships/requests/${friendshipId}/reject`);
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to reject friend request');
    }
};

// Remove a friend (unfriend) or cancel an outgoing request
export const removeFriendship = async (friendshipId: number): Promise<void> => {
    try {
        await apiClient.delete(`/friendships/${friendshipId}`);
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to remove friendship/request');
    }
};