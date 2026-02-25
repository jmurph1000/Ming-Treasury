'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCreatePayment, useSubmitPayment, useCheckDuplicates } from '@/hooks/usePayments';
import { useAuth, usePaymentLimit } from '@/hooks/useAuth';
import { accountsApi, payeesApi, templatesApi, calendarApi } from '@/lib/api';
import { formatCurrency, debounce } from '@/lib/utils';
import { CURRENCIES, PAYMENT_TYPES, RECURRING_FREQUENCIES, VALIDATION, ROUTES } from '@/lib/constants';
import { ArrowLeft, AlertTriangle, Calendar, Upload, Save, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewPaymentPage() {
  const router = useRouter();
  const { user } = useAuth();
  const paymentLimit = usePaymentLimit();

  const [formData, setFormData] = useState({
    payeeName: '',
    payeeId: '',
    amount: '',
    currency: 'USD' as const,
    accountId: '',
    paymentType: 'ach' as const,
    businessJustification: '',
    requestedDate: '',
    isRecurring: false,
    recurringFrequency: '',
    recurringEndDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);
  const [dateWarning, setDateWarning] = useState<string | null>(null);

  // Queries
  const { data: accountsData } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: payeesData } = useQuery({
    queryKey: ['payees', formData.paymentType],
    queryFn: () => payeesApi.list('', formData.paymentType),
  });

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: () => templatesApi.list(),
  });

  // Check for duplicates when payee and amount change
  const { data: duplicatesData } = useCheckDuplicates(
    formData.payeeName,
    parseFloat(formData.amount) || 0,
    formData.currency
  );

  useEffect(() => {
    if (duplicatesData?.data?.hasDuplicates) {
      setIsDuplicateWarning(true);
    } else {
      setIsDuplicateWarning(false);
    }
  }, [duplicatesData]);

  // Validate date when it changes
  useEffect(() => {
    if (formData.requestedDate) {
      calendarApi.validateDate(formData.requestedDate).then((response) => {
        if (response.data && !response.data.isBusinessDay) {
          if (response.data.isWeekend) {
            setDateWarning('This date falls on a weekend');
          } else if (response.data.isHoliday) {
            setDateWarning(`This date is a bank holiday: ${response.data.holidayName}`);
          }
        } else {
          setDateWarning(null);
        }
      });
    }
  }, [formData.requestedDate]);

  // Mutations
  const createPayment = useCreatePayment();
  const submitPayment = useSubmitPayment();

  const accounts = accountsData?.data || [];
  const payees = payeesData?.data || [];
  const templates = templatesData?.data || [];

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => ({ ...prev, [name]: newValue }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  }

  function handlePayeeSelect(payeeId: string) {
    const payee = payees.find((p) => p.id === payeeId);
    if (payee) {
      setFormData((prev) => ({
        ...prev,
        payeeId,
        payeeName: payee.name,
        currency: payee.currency,
      }));
    }
  }

  function handleTemplateSelect(templateId: string) {
    const template = templates.find((t) => t.id === templateId);
    if (template) {
      setFormData((prev) => ({
        ...prev,
        payeeName: template.payee_name || '',
        payeeId: template.payee_id || '',
        paymentType: template.payment_type,
        accountId: template.account_id || '',
        amount: template.default_amount?.toString() || '',
        currency: template.currency,
        businessJustification: template.default_justification || '',
      }));
    }
  }

  function validateForm(): boolean {
    const newErrors: Record<string, string> = {};

    if (!formData.payeeName) {
      newErrors.payeeName = 'Payee name is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    const amount = parseFloat(formData.amount);
    if (paymentLimit !== null && amount > paymentLimit) {
      newErrors.amount = `Amount exceeds your limit of ${formatCurrency(paymentLimit)}`;
    }

    if (!formData.accountId) {
      newErrors.accountId = 'Source account is required';
    }

    if (!formData.businessJustification || formData.businessJustification.length < VALIDATION.MIN_JUSTIFICATION_LENGTH) {
      newErrors.businessJustification = `Justification must be at least ${VALIDATION.MIN_JUSTIFICATION_LENGTH} characters`;
    }

    if (!formData.requestedDate) {
      newErrors.requestedDate = 'Requested date is required';
    }

    if (formData.isRecurring && !formData.recurringFrequency) {
      newErrors.recurringFrequency = 'Frequency is required for recurring payments';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSaveDraft() {
    if (!validateForm()) return;

    try {
      const response = await createPayment.mutateAsync({
        payeeName: formData.payeeName,
        payeeId: formData.payeeId || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        accountId: formData.accountId,
        paymentType: formData.paymentType,
        businessJustification: formData.businessJustification,
        requestedDate: formData.requestedDate,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : undefined,
      });

      if (response.data) {
        router.push(ROUTES.PAYMENT_DETAIL(response.data.id));
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      const createResponse = await createPayment.mutateAsync({
        payeeName: formData.payeeName,
        payeeId: formData.payeeId || undefined,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        accountId: formData.accountId,
        paymentType: formData.paymentType,
        businessJustification: formData.businessJustification,
        requestedDate: formData.requestedDate,
        isRecurring: formData.isRecurring,
        recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
        recurringEndDate: formData.isRecurring ? formData.recurringEndDate : undefined,
      });

      if (createResponse.data) {
        await submitPayment.mutateAsync(createResponse.data.id);
        router.push(ROUTES.PAYMENTS);
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  }

  const isSubmitting = createPayment.isPending || submitPayment.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={ROUTES.PAYMENTS} className="p-2 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Payment Request</h1>
          <p className="text-gray-500 mt-1">Create a new payment for approval</p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {errors.submit}
          </div>
        )}

        {isDuplicateWarning && (
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded-md flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-yellow-800 font-medium">Potential Duplicate Detected</p>
              <p className="text-yellow-700 text-sm mt-1">
                A similar payment to this payee for this amount was made in the last 90 days.
              </p>
            </div>
          </div>
        )}

        {/* Template Selection */}
        {templates.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Load from Template
            </label>
            <select
              onChange={(e) => handleTemplateSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select a template...</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Payee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Saved Payee
            </label>
            <select
              value={formData.payeeId}
              onChange={(e) => handlePayeeSelect(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="">Select or enter new...</option>
              {payees.map((payee) => (
                <option key={payee.id} value={payee.id}>
                  {payee.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payee Name *
            </label>
            <input
              type="text"
              name="payeeName"
              value={formData.payeeName}
              onChange={handleInputChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.payeeName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Enter payee name"
            />
            {errors.payeeName && <p className="text-red-500 text-sm mt-1">{errors.payeeName}</p>}
          </div>
        </div>

        {/* Amount and Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount *
            </label>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleInputChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent text-right font-mono ${
                errors.amount ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="0.00"
              step="0.01"
              min="0"
            />
            {errors.amount && <p className="text-red-500 text-sm mt-1">{errors.amount}</p>}
            {paymentLimit !== null && (
              <p className="text-gray-500 text-sm mt-1">Your limit: {formatCurrency(paymentLimit)}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Currency
            </label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {CURRENCIES.map((curr) => (
                <option key={curr.value} value={curr.value}>
                  {curr.value}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Source Account and Payment Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Source Account *
            </label>
            <select
              name="accountId"
              value={formData.accountId}
              onChange={handleInputChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.accountId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank_name})
                </option>
              ))}
            </select>
            {errors.accountId && <p className="text-red-500 text-sm mt-1">{errors.accountId}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Type *
            </label>
            <select
              name="paymentType"
              value={formData.paymentType}
              onChange={handleInputChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {PAYMENT_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Requested Date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Requested Execution Date *
          </label>
          <div className="relative">
            <input
              type="date"
              name="requestedDate"
              value={formData.requestedDate}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.requestedDate ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          {errors.requestedDate && <p className="text-red-500 text-sm mt-1">{errors.requestedDate}</p>}
          {dateWarning && (
            <p className="text-yellow-600 text-sm mt-1 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4" />
              {dateWarning}
            </p>
          )}
        </div>

        {/* Business Justification */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Business Justification *
          </label>
          <textarea
            name="businessJustification"
            value={formData.businessJustification}
            onChange={handleInputChange}
            rows={3}
            className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
              errors.businessJustification ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Explain the purpose of this payment (minimum ${VALIDATION.MIN_JUSTIFICATION_LENGTH} characters)`}
          />
          <div className="flex justify-between mt-1">
            {errors.businessJustification && (
              <p className="text-red-500 text-sm">{errors.businessJustification}</p>
            )}
            <p className="text-gray-500 text-sm ml-auto">
              {formData.businessJustification.length} / {VALIDATION.MIN_JUSTIFICATION_LENGTH} min
            </p>
          </div>
        </div>

        {/* Recurring Toggle */}
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            name="isRecurring"
            id="isRecurring"
            checked={formData.isRecurring}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          />
          <label htmlFor="isRecurring" className="text-sm font-medium text-gray-700">
            This is a recurring payment
          </label>
        </div>

        {formData.isRecurring && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-7">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frequency *
              </label>
              <select
                name="recurringFrequency"
                value={formData.recurringFrequency}
                onChange={handleInputChange}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors.recurringFrequency ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select frequency...</option>
                {RECURRING_FREQUENCIES.map((freq) => (
                  <option key={freq.value} value={freq.value}>
                    {freq.label}
                  </option>
                ))}
              </select>
              {errors.recurringFrequency && (
                <p className="text-red-500 text-sm mt-1">{errors.recurringFrequency}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                name="recurringEndDate"
                value={formData.recurringEndDate}
                onChange={handleInputChange}
                min={formData.requestedDate || new Date().toISOString().split('T')[0]}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <button
            type="button"
            onClick={handleSaveDraft}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit for Approval
          </button>
        </div>
      </div>
    </div>
  );
}
