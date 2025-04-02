import apiClient from './api';
import { CommentCreateRequest, CommentResponseDto } from '../types/api';

/**
 * Fetches all comments for a specific expense.
 * @param expenseId The ID of the expense.
 * @returns A promise that resolves to an array of comments.
 */
export const getCommentsForExpense = async (expenseId: number): Promise<CommentResponseDto[]> => {
    try {
        const response = await apiClient.get<CommentResponseDto[]>(`/expenses/${expenseId}/comments`);
        return response.data;
    } catch (error: any) {
        console.error(`Failed to fetch comments for expense ${expenseId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to fetch comments');
    }
};

/**
 * Adds a new comment to an expense.
 * @param expenseId The ID of the expense to comment on.
 * @param commentData The comment content.
 * @returns A promise that resolves to the newly created comment.
 */
export const addCommentToExpense = async (expenseId: number, commentData: CommentCreateRequest): Promise<CommentResponseDto> => {
    try {
        const response = await apiClient.post<CommentResponseDto>(`/expenses/${expenseId}/comments`, commentData);
        return response.data;
    } catch (error: any) {
        console.error(`Failed to add comment to expense ${expenseId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to add comment');
    }
};

/**
 * Deletes a specific comment.
 * @param commentId The ID of the comment to delete.
 * @returns A promise that resolves when the deletion is successful.
 */
export const deleteComment = async (commentId: number): Promise<void> => {
    try {
        await apiClient.delete(`/comments/${commentId}`);
    } catch (error: any) {
        console.error(`Failed to delete comment ${commentId}:`, error.response?.data || error.message);
        throw error.response?.data || new Error('Failed to delete comment');
    }
};