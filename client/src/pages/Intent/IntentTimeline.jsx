import { INTENT_STATUSES } from '../../utils/constants';

const STATUS_STEP_ORDER = [
  { key: INTENT_STATUSES.DRAFT, label: 'Draft', icon: 'edit' },
  { key: 'PENDING_MANAGER_APPROVAL', label: 'Manager Review', icon: 'clock' },
  { key: 'PENDING_QUOTATION', label: 'Pending Quotation', icon: 'document' },
  { key: 'QUOTATION_COLLECTED', label: 'Quotation Collected', icon: 'check' },
  { key: 'PENDING_PO', label: 'Pending PO', icon: 'cart' },
  { key: 'PENDING_ADMIN_APPROVAL', label: 'Admin Approval', icon: 'shield' },
  { key: 'PO_APPROVED', label: 'PO Approved', icon: 'check' },
  { key: 'DELIVERY_PENDING', label: 'Delivery', icon: 'truck' },
  { key: 'FULL_DELIVERY', label: 'Delivered', icon: 'check' },
  { key: 'INVOICE_UPLOADED', label: 'Invoice', icon: 'receipt' },
  { key: 'PAYMENT_COMPLETED', label: 'Payment Done', icon: 'money' },
  { key: 'CLOSED', label: 'Closed', icon: 'lock' },
];

const getStepStatus = (stepKey, currentStatus, statusHistory) => {
  const historyEntry = statusHistory?.find((h) => h.status === stepKey);
  if (historyEntry) return 'completed';
  if (stepKey === currentStatus) return 'current';

  const currentIdx = STATUS_STEP_ORDER.findIndex((s) => s.key === currentStatus);
  const stepIdx = STATUS_STEP_ORDER.findIndex((s) => s.key === stepKey);
  if (stepIdx < currentIdx) return 'completed';
  if (stepIdx === currentIdx) return 'current';
  return 'pending';
};

const StepIcon = ({ type, status }) => {
  if (status === 'completed') {
    return (
      <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
      </svg>
    );
  }

  const icons = {
    edit: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
    clock: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    document: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
    check: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    cart: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" /></svg>,
    shield: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    truck: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    receipt: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" /></svg>,
    money: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    lock: <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>,
  };

  return icons[type] || null;
};

const IntentTimeline = ({ currentStatus, statusHistory = [] }) => {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Find the current step index for animation delay
  const currentStepIdx = STATUS_STEP_ORDER.findIndex((s) => s.key === currentStatus);

  return (
    <div className="relative">
      <div className="space-y-0">
        {STATUS_STEP_ORDER.map((step, idx) => {
          const stepStatus = getStepStatus(step.key, currentStatus, statusHistory);
          const historyEntry = statusHistory?.find((h) => h.status === step.key);
          const isLast = idx === STATUS_STEP_ORDER.length - 1;
          const delay = idx * 80;

          return (
            <div key={step.key} className="relative" style={{ animationDelay: `${delay}ms` }}>
              {/* Connector line */}
              {!isLast && (
                <div className="absolute left-[19px] top-[40px] w-0.5 h-[calc(100%-20px)]">
                  <div className={`w-full h-full transition-all duration-500 ${
                    stepStatus === 'completed' ? 'bg-green-500' : 'bg-gray-200'
                  }`} />
                  {stepStatus === 'completed' && (
                    <div className="absolute inset-0 bg-green-500 animate-pulse-line" />
                  )}
                </div>
              )}

              {/* Step content */}
              <div className={`relative flex items-start space-x-4 pb-6 ${stepStatus === 'current' ? 'animate-step-in' : ''}`}>
                {/* Circle */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ring-4 ring-white transition-all duration-500 ${
                  stepStatus === 'completed'
                    ? 'bg-green-500 shadow-lg shadow-green-200'
                    : stepStatus === 'current'
                    ? 'bg-blue-500 shadow-lg shadow-blue-200 animate-pulse'
                    : 'bg-gray-100 border-2 border-gray-200'
                }`}>
                  <StepIcon type={step.icon} status={stepStatus} />
                </div>

                {/* Arrow connector */}
                {!isLast && stepStatus === 'completed' && (
                  <div className="absolute left-[23px] top-[30px] z-10 animate-arrow-flow">
                    <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}

                {/* Label */}
                <div className="min-w-0 flex-1 pt-1">
                  <div className={`text-sm font-semibold transition-all duration-300 ${
                    stepStatus === 'completed'
                      ? 'text-green-700'
                      : stepStatus === 'current'
                      ? 'text-blue-700'
                      : 'text-gray-400'
                  }`}>
                    {step.label}
                  </div>
                  {stepStatus === 'current' && (
                    <div className="mt-1 flex items-center space-x-2 animate-fade-in">
                      <div className="flex space-x-1">
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                      <span className="text-xs text-blue-500 font-medium">In Progress</span>
                    </div>
                  )}
                  {historyEntry && stepStatus === 'completed' && (
                    <div className="mt-1 text-xs text-gray-500 space-y-0.5 animate-fade-in">
                      <p className="text-gray-600">{historyEntry.changedBy?.name || 'System'}</p>
                      <p className="text-gray-400">{formatDateTime(historyEntry.changedAt)}</p>
                      {historyEntry.remarks && (
                        <p className="italic text-gray-400 mt-0.5">{historyEntry.remarks}</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default IntentTimeline;
