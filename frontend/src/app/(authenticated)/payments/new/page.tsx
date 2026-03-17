'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useCreatePayment, useSubmitPayment, useUpdatePayment, useCheckDuplicates, usePayment } from '@/hooks/usePayments';
import { useAuth, usePaymentLimit } from '@/hooks/useAuth';
import { accountsApi, payeesApi, templatesApi } from '@/lib/api';
import { formatCurrency, debounce } from '@/lib/utils';
import { CURRENCIES, PAYMENT_TYPES, FUNDING_TYPES, RECURRING_FREQUENCIES, VALIDATION, ROUTES } from '@/lib/constants';
import { ArrowLeft, AlertTriangle, Upload, Save, Send, Loader2 } from 'lucide-react';
import Link from 'next/link';
import BusinessDayPicker from '@/components/BusinessDayPicker';
import type { Currency, PaymentType, FundingType } from '@/types';

export default function NewPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editPaymentId = searchParams.get('edit');
  const isEditMode = !!editPaymentId;
  const { user } = useAuth();
  const paymentLimit = usePaymentLimit();
  const updatePayment = useUpdatePayment();

  const [formData, setFormData] = useState<{
    payeeName: string;
    payeeId: string;
    amount: string;
    currency: Currency;
    accountId: string;
    paymentType: PaymentType;
    fundingType: FundingType;
    destinationAccountId: string;
    extBankName: string;
    extRoutingNumber: string;
    extBankAccount: string;
    extRecipientAddress: string;
    extSpecialInstructions: string;
    businessJustification: string;
    requestedDate: string;
    isRecurring: boolean;
    recurringFrequency: string;
    recurringEndDate: string;
  }>({
    payeeName: '',
    payeeId: '',
    amount: '',
    currency: 'USD',
    accountId: '',
    paymentType: 'ach',
    fundingType: 'external',
    destinationAccountId: '',
    extBankName: '',
    extRoutingNumber: '',
    extBankAccount: '',
    extRecipientAddress: '',
    extSpecialInstructions: '',
    businessJustification: '',
    requestedDate: '',
    isRecurring: false,
    recurringFrequency: '',
    recurringEndDate: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isDuplicateWarning, setIsDuplicateWarning] = useState(false);

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

  // Load existing payment data when in edit mode
  const { data: editPaymentData } = usePayment(editPaymentId || '');
  const [editLoaded, setEditLoaded] = useState(false);

  useEffect(() => {
    if (isEditMode && editPaymentData?.data && !editLoaded) {
      const p = editPaymentData.data;
      setFormData({
        payeeName: p.payee_name || '',
        payeeId: p.payee_id || '',
        amount: p.amount?.toString() || '',
        currency: (p.currency as Currency) || 'USD',
        accountId: p.account_id || '',
        paymentType: (p.payment_type as PaymentType) || 'ach',
        fundingType: (p.funding_type as FundingType) || 'external',
        destinationAccountId: p.destination_account_id || '',
        extBankName: p.ext_bank_name || '',
        extRoutingNumber: p.ext_routing_number || '',
        extBankAccount: p.ext_bank_account || '',
        extRecipientAddress: p.ext_recipient_address || '',
        extSpecialInstructions: p.ext_special_instructions || '',
        businessJustification: p.business_justification || '',
        requestedDate: p.requested_date ? p.requested_date.slice(0, 10) : '',
        isRecurring: !!p.is_recurring,
        recurringFrequency: p.recurring_frequency || '',
        recurringEndDate: p.recurring_end_date ? p.recurring_end_date.slice(0, 10) : '',
      });
      setEditLoaded(true);
    }
  }, [isEditMode, editPaymentData, editLoaded]);

  // Date warning is now handled by BusinessDayPicker component

  // Mutations
  const createPayment = useCreatePayment();
  const submitPayment = useSubmitPayment();

  const accounts = accountsData?.data || [];
  const payees = payeesData?.data || [];
  const templates = templatesData?.data || [];

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setFormData((prev) => {
      const updated = { ...prev, [name]: newValue };
      // Clear irrelevant fields when funding type changes
      if (name === 'fundingType') {
        if (value === 'internal') {
          updated.extBankName = '';
          updated.extRoutingNumber = '';
          updated.extBankAccount = '';
          updated.extRecipientAddress = '';
          updated.extSpecialInstructions = '';
        } else {
          updated.destinationAccountId = '';
        }
      }
      return updated;
    });
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

    if (formData.fundingType === 'internal' && !formData.destinationAccountId) {
      newErrors.destinationAccountId = 'Destination account is required for internal funding';
    }

    if (formData.fundingType === 'external') {
      if (!formData.extBankName) {
        newErrors.extBankName = 'Bank name is required';
      }
      if (!formData.extRoutingNumber) {
        newErrors.extRoutingNumber = 'Routing number is required';
      }
      if (!formData.extBankAccount) {
        newErrors.extBankAccount = 'Bank account is required';
      }
      if (!formData.extRecipientAddress) {
        newErrors.extRecipientAddress = 'Recipient address is required';
      }
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

  function buildPaymentPayload() {
    return {
      payeeName: formData.payeeName,
      payeeId: formData.payeeId || undefined,
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      accountId: formData.accountId,
      paymentType: formData.paymentType,
      fundingType: formData.fundingType,
      destinationAccountId: formData.fundingType === 'internal' ? formData.destinationAccountId || undefined : undefined,
      extBankName: formData.fundingType === 'external' ? formData.extBankName || undefined : undefined,
      extRoutingNumber: formData.fundingType === 'external' ? formData.extRoutingNumber || undefined : undefined,
      extBankAccount: formData.fundingType === 'external' ? formData.extBankAccount || undefined : undefined,
      extRecipientAddress: formData.fundingType === 'external' ? formData.extRecipientAddress || undefined : undefined,
      extSpecialInstructions: formData.fundingType === 'external' ? formData.extSpecialInstructions || undefined : undefined,
      businessJustification: formData.businessJustification,
      requestedDate: formData.requestedDate,
      isRecurring: formData.isRecurring,
      recurringFrequency: formData.isRecurring ? formData.recurringFrequency : undefined,
      recurringEndDate: formData.isRecurring ? formData.recurringEndDate : undefined,
    };
  }

  async function handleSaveDraft() {
    if (!validateForm()) return;

    try {
      if (isEditMode && editPaymentId) {
        await updatePayment.mutateAsync({ id: editPaymentId, data: buildPaymentPayload() });
        router.push(ROUTES.PAYMENT_DETAIL(editPaymentId));
      } else {
        const response = await createPayment.mutateAsync(buildPaymentPayload());
        if (response.data) {
          router.push(ROUTES.PAYMENT_DETAIL(response.data.id));
        }
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    try {
      if (isEditMode && editPaymentId) {
        await updatePayment.mutateAsync({ id: editPaymentId, data: buildPaymentPayload() });
        await submitPayment.mutateAsync(editPaymentId);
        router.push(ROUTES.PAYMENT_DETAIL(editPaymentId));
      } else {
        const createResponse = await createPayment.mutateAsync(buildPaymentPayload());
        if (createResponse.data) {
          await submitPayment.mutateAsync(createResponse.data.id);
          router.push(ROUTES.PAYMENTS);
        }
      }
    } catch (error: any) {
      setErrors({ submit: error.message });
    }
  }

  const isSubmitting = createPayment.isPending || submitPayment.isPending || updatePayment.isPending;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={isEditMode && editPaymentId ? ROUTES.PAYMENT_DETAIL(editPaymentId) : ROUTES.PAYMENTS} className="p-2 hover:bg-gray-100 rounded-md">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditMode ? 'Edit Payment' : 'New Payment Request'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isEditMode ? 'Update payment details and resubmit for approval' : 'Create a new payment for approval'}
          </p>
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

        {/* Funding Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Funding Type *
          </label>
          <select
            name="fundingType"
            value={formData.fundingType}
            onChange={handleInputChange}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {FUNDING_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        {/* Internal Funding: Destination Account */}
        {formData.fundingType === 'internal' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Destination Account *
            </label>
            <select
              name="destinationAccountId"
              value={formData.destinationAccountId}
              onChange={handleInputChange}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                errors.destinationAccountId ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">Select destination account...</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.bank_name})
                </option>
              ))}
            </select>
            {errors.destinationAccountId && (
              <p className="text-red-500 text-sm mt-1">{errors.destinationAccountId}</p>
            )}
          </div>
        )}

        {/* External Funding: Third-Party Bank Details */}
        {formData.fundingType === 'external' && (
          <div className="border border-gray-200 rounded-md p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-800">Third-Party Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Name *
                </label>
                <input
                  type="text"
                  name="extBankName"
                  value={formData.extBankName}
                  onChange={handleInputChange}
                  maxLength={30}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.extBankName ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Bank name"
                />
                {errors.extBankName && <p className="text-red-500 text-sm mt-1">{errors.extBankName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Routing Number *
                </label>
                <input
                  type="text"
                  name="extRoutingNumber"
                  value={formData.extRoutingNumber}
                  onChange={handleInputChange}
                  maxLength={30}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.extRoutingNumber ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Routing number"
                />
                {errors.extRoutingNumber && <p className="text-red-500 text-sm mt-1">{errors.extRoutingNumber}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bank Account *
                </label>
                <input
                  type="text"
                  name="extBankAccount"
                  value={formData.extBankAccount}
                  onChange={handleInputChange}
                  maxLength={30}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.extBankAccount ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Account number"
                />
                {errors.extBankAccount && <p className="text-red-500 text-sm mt-1">{errors.extBankAccount}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recipient Address *
                </label>
                <input
                  type="text"
                  name="extRecipientAddress"
                  value={formData.extRecipientAddress}
                  onChange={handleInputChange}
                  maxLength={30}
                  className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent ${
                    errors.extRecipientAddress ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Recipient address"
                />
                {errors.extRecipientAddress && <p className="text-red-500 text-sm mt-1">{errors.extRecipientAddress}</p>}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Special Instructions
              </label>
              <input
                type="text"
                name="extSpecialInstructions"
                value={formData.extSpecialInstructions}
                onChange={handleInputChange}
                maxLength={30}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Optional special instructions"
              />
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
          <BusinessDayPicker
            value={formData.requestedDate}
            onChange={(date) => {
              setFormData((prev) => ({ ...prev, requestedDate: date }));
              setErrors((prev) => ({ ...prev, requestedDate: '' }));
            }}
            error={errors.requestedDate}
          />
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
            {isEditMode ? 'Save Changes' : 'Save Draft'}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gusto-green text-white rounded-md hover:bg-gusto-green-dark disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isEditMode ? 'Save & Resubmit' : 'Submit for Approval'}
          </button>
        </div>
      </div>
    </div>
  );
}
