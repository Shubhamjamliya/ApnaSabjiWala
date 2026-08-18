import { FormEvent, useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { useToast } from '../../../context/ToastContext';
import {
  getAppSettings,
  NeedHelpSettings,
  updateNeedHelpSettings,
} from '../../../services/api/admin/adminSettingsService';

const emptySettings: NeedHelpSettings = {
  mobileNumber: '',
  email: '',
  whatsappNumber: '',
};

const normalizePhone = (value: string) => value.trim().replace(/[\s().-]/g, '');
const phonePattern = /^\+?[1-9]\d{6,14}$/;
const whatsappPattern = /^\+[1-9]\d{7,14}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AdminNeedHelpSettings() {
  const { showToast } = useToast();
  const [form, setForm] = useState<NeedHelpSettings>(emptySettings);
  const [errors, setErrors] = useState<Partial<Record<keyof NeedHelpSettings, string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await getAppSettings();
        if (response.success && response.data.needHelpSettings) {
          setForm(response.data.needHelpSettings);
        }
      } catch (error) {
        console.error(error);
        showToast('Failed to fetch need help settings', 'error');
      } finally {
        setLoading(false);
      }
    };

    void loadSettings();
  }, [showToast]);

  const validate = () => {
    const nextErrors: Partial<Record<keyof NeedHelpSettings, string>> = {};

    if (!phonePattern.test(normalizePhone(form.mobileNumber))) {
      nextErrors.mobileNumber = 'Enter 7 to 15 digits, optionally starting with +.';
    }
    if (!emailPattern.test(form.email.trim()) || form.email.trim().length > 254) {
      nextErrors.email = 'Enter a valid email address.';
    }
    if (!whatsappPattern.test(normalizePhone(form.whatsappNumber))) {
      nextErrors.whatsappNumber = 'Include +, country code, and a valid mobile number.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleChange = (field: keyof NeedHelpSettings, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!validate()) return;

    const normalized: NeedHelpSettings = {
      mobileNumber: normalizePhone(form.mobileNumber),
      email: form.email.trim().toLowerCase(),
      whatsappNumber: normalizePhone(form.whatsappNumber),
    };

    try {
      setSaving(true);
      const response = await updateNeedHelpSettings(normalized);
      if (response.success) {
        setForm(response.data);
        showToast('Need help settings updated successfully');
      }
    } catch (error: unknown) {
      console.error(error);
      const message = isAxiosError<{ message?: string }>(error)
        ? error.response?.data?.message
        : undefined;
      showToast(message || 'Failed to update need help settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  const fields: Array<{
    key: keyof NeedHelpSettings;
    label: string;
    type: 'tel' | 'email';
    placeholder: string;
    help: string;
  }> = [
    {
      key: 'mobileNumber',
      label: 'Call Us Mobile Number',
      type: 'tel',
      placeholder: '+91 98765 43210',
      help: 'Used by the Call Us button on the customer FAQ page.',
    },
    {
      key: 'email',
      label: 'Email Us Address',
      type: 'email',
      placeholder: 'help@example.com',
      help: 'Used by the Email Us button on the customer FAQ page.',
    },
    {
      key: 'whatsappNumber',
      label: 'WhatsApp Number',
      type: 'tel',
      placeholder: '+91 98765 43210',
      help: 'Include the country code so the WhatsApp chat opens correctly.',
    },
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-neutral-200 bg-white px-4 py-4 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-bold text-neutral-900 sm:text-2xl">Need Help Setting</h1>
          <div className="text-sm text-neutral-600">
            <span className="text-blue-600">Home</span> / Need Help Setting
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto bg-neutral-50 p-4 sm:p-6">
        <form onSubmit={handleSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
          <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-sm">
            <div className="bg-teal-600 px-4 py-3 sm:px-6">
              <h2 className="text-lg font-semibold text-white">Customer Contact Details</h2>
            </div>
            <div className="space-y-5 p-4 sm:p-6">
              <p className="text-sm text-neutral-600">
                These details control the contact buttons in the customer Need Help section.
              </p>
              {fields.map((field) => (
                <div key={field.key}>
                  <label htmlFor={field.key} className="mb-1.5 block text-sm font-medium text-neutral-800">
                    {field.label} <span className="text-red-600">*</span>
                  </label>
                  <input
                    id={field.key}
                    type={field.type}
                    value={form[field.key]}
                    onChange={(event) => handleChange(field.key, event.target.value)}
                    placeholder={field.placeholder}
                    autoComplete={field.type === 'email' ? 'email' : 'tel'}
                    maxLength={field.type === 'email' ? 254 : 30}
                    required
                    aria-invalid={Boolean(errors[field.key])}
                    aria-describedby={`${field.key}-help`}
                    className={`w-full rounded-lg border px-4 py-3 text-sm outline-none transition focus:ring-2 focus:ring-teal-500 ${
                      errors[field.key] ? 'border-red-500' : 'border-neutral-300 focus:border-teal-500'
                    }`}
                  />
                  <p id={`${field.key}-help`} className={`mt-1.5 text-xs ${errors[field.key] ? 'text-red-600' : 'text-neutral-500'}`}>
                    {errors[field.key] || field.help}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-teal-600 px-8 py-2.5 text-base font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
