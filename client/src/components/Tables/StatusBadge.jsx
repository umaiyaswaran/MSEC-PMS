const StatusBadge = ({ status, size = 'md' }) => {
  const getStatusConfig = (status) => {
    const normalizedStatus = status?.toLowerCase() || '';
    
    const configs = {
      success: {
        colors: 'bg-green-100 text-green-800',
        dot: 'bg-green-400',
      },
      approved: {
        colors: 'bg-green-100 text-green-800',
        dot: 'bg-green-400',
      },
      completed: {
        colors: 'bg-green-100 text-green-800',
        dot: 'bg-green-400',
      },
      active: {
        colors: 'bg-green-100 text-green-800',
        dot: 'bg-green-400',
      },
      warning: {
        colors: 'bg-yellow-100 text-yellow-800',
        dot: 'bg-yellow-400',
      },
      pending: {
        colors: 'bg-yellow-100 text-yellow-800',
        dot: 'bg-yellow-400',
      },
      review: {
        colors: 'bg-yellow-100 text-yellow-800',
        dot: 'bg-yellow-400',
      },
      danger: {
        colors: 'bg-red-100 text-red-800',
        dot: 'bg-red-400',
      },
      rejected: {
        colors: 'bg-red-100 text-red-800',
        dot: 'bg-red-400',
      },
      cancelled: {
        colors: 'bg-red-100 text-red-800',
        dot: 'bg-red-400',
      },
      info: {
        colors: 'bg-blue-100 text-blue-800',
        dot: 'bg-blue-400',
      },
      submitted: {
        colors: 'bg-blue-100 text-blue-800',
        dot: 'bg-blue-400',
      },
      processing: {
        colors: 'bg-blue-100 text-blue-800',
        dot: 'bg-blue-400',
      },
      default: {
        colors: 'bg-gray-100 text-gray-800',
        dot: 'bg-gray-400',
      },
    };

    return configs[normalizedStatus] || configs.default;
  };

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-sm',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
  };

  const config = getStatusConfig(status);
  const sizeClass = sizeClasses[size] || sizeClasses.md;
  const dotSizeClass = dotSizeClasses[size] || dotSizeClasses.md;

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${config.colors} ${sizeClass}`}
    >
      <span
        className={`rounded-full ${config.dot} ${dotSizeClass} mr-1.5`}
        aria-hidden="true"
      />
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
