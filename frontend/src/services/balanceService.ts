import apiClient from './api';
import { BalanceDto, OverallBalanceSummaryDto } from '../types/api';

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