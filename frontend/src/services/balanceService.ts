import apiClient from './api';
import { BalanceDto, OverallBalanceSummaryDto, SimplifiedPaymentDto } from '../types/api'; // Added SimplifiedPaymentDto

export const getOverallBalanceSummary = async (): Promise<OverallBalanceSummaryDto> => {
  try {
    const response = await apiClient.get<OverallBalanceSummaryDto>('/balances/overall');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || new Error('Failed to fetch overall balance summary');
  }
};

// Fetches balances within a specific group for the current user
export const getGroupBalances = async (groupId: number): Promise<BalanceDto[]> => {
  try {
    const response = await apiClient.get<BalanceDto[]>(`/balances/group/${groupId}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || new Error(`Failed to fetch balances for group ${groupId}`);
}
};

// Fetches the simplified payment plan for a specific group
export const getSimplifiedGroupPayments = async (groupId: number): Promise<SimplifiedPaymentDto[]> => {
try {
    const response = await apiClient.get<SimplifiedPaymentDto[]>(`/balances/group/${groupId}/simplified`);
    return response.data;
} catch (error: any) {
    throw error.response?.data || new Error(`Failed to fetch simplified payments for group ${groupId}`);
}
};