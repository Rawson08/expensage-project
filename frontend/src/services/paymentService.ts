import apiClient from './api';
import { PaymentCreateRequest, PaymentResponseDto } from '../types/api';

// Records a new payment
export const recordPayment = async (paymentData: PaymentCreateRequest): Promise<PaymentResponseDto> => {
  try {
    const response = await apiClient.post<PaymentResponseDto>('/payments', paymentData);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || new Error('Failed to record payment');
  }
};

// Deletes a specific payment
export const deletePayment = async (paymentId: number): Promise<void> => {
    try {
        await apiClient.delete(`/payments/${paymentId}`);
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to delete payment ${paymentId}`);
    }
};

// Updates an existing payment
export const updatePayment = async (paymentId: number, paymentData: PaymentCreateRequest): Promise<PaymentResponseDto> => {
    try {
        const formattedData = {
            ...paymentData,
            date: paymentData.date ? new Date(paymentData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        };
        const response = await apiClient.put<PaymentResponseDto>(`/payments/${paymentId}`, formattedData);
        return response.data;
    } catch (error: any) {
        throw error.response?.data || new Error(`Failed to update payment ${paymentId}`);
    }
};