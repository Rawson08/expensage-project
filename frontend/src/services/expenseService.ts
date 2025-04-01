import apiClient from './api';
import { ExpenseCreateRequest, ExpenseResponseDto } from '../types/api';

// Fetches all expenses involving the current user
export const getMyExpenses = async (): Promise<ExpenseResponseDto[]> => {
  try {
    const response = await apiClient.get<ExpenseResponseDto[]>('/expenses/my');
    return response.data;
  } catch (error: any) {
    throw error.response?.data || new Error('Failed to fetch expenses');
  }
};

// Creates a new expense
export const createExpense = async (expenseData: ExpenseCreateRequest, receiptFile?: File | null): Promise<ExpenseResponseDto> => {
    const formData = new FormData();
    formData.append('expenseData', JSON.stringify(expenseData));
    if (receiptFile) {
        formData.append('receiptFile', receiptFile);
    }

    try {
        const response = await apiClient.post<ExpenseResponseDto>('/expenses', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error('Failed to create expense');
    }
};

// Updates an existing expense
export const updateExpense = async (expenseId: number, expenseData: ExpenseCreateRequest, receiptFile?: File | null): Promise<ExpenseResponseDto> => {
    const formData = new FormData();
    const formattedData = {
        ...expenseData,
        date: expenseData.date ? new Date(expenseData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    };
    formData.append('expenseData', JSON.stringify(formattedData));
    if (receiptFile) {
        formData.append('receiptFile', receiptFile);
    }

    try {
        const response = await apiClient.put<ExpenseResponseDto>(`/expenses/${expenseId}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to update expense ${expenseId}`);
    }
};


// Deletes an expense
export const deleteExpense = async (expenseId: number): Promise<void> => {
    try {
        await apiClient.delete(`/expenses/${expenseId}`);
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to delete expense ${expenseId}`);
    }
};