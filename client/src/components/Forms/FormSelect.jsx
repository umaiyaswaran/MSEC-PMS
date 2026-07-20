import { useState, useEffect } from 'react';

const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options = [],
  error,
  required = false,
  placeholder = 'Select an option',
  disabled = false,
  searchable = false,
  className = '',
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!searchable) return;
    const selectedOption = options.find((option) => option.value === value);
    if (selectedOption) {
      setSearchTerm(selectedOption.label);
    }
  }, [value, options, searchable]);

  const filteredOptions = searchable
    ? options.filter((option) => option.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : options;

  const findMatchingOption = (text) => {
    const normalizedText = text.trim().toLowerCase();
    if (!normalizedText) return null;
    return options.find((option) => option.label.toLowerCase() === normalizedText);
  };

  const handleSearchChange = (e) => {
    const nextValue = e.target.value;
    setSearchTerm(nextValue);

    if (!searchable) return;

    if (!nextValue) {
      onChange({ target: { name, value: '' } });
      return;
    }

    const exactMatch = findMatchingOption(nextValue);
    if (exactMatch) {
      onChange({ target: { name, value: exactMatch.value } });
      setSearchTerm(exactMatch.label);
      return;
    }

    onChange({ target: { name, value: nextValue } });
  };

  const handleSearchBlur = () => {
    if (!searchable) return;
    const exactMatch = findMatchingOption(searchTerm);
    if (exactMatch) {
      onChange({ target: { name, value: exactMatch.value } });
      setSearchTerm(exactMatch.label);
      return;
    }
    onChange({ target: { name, value: searchTerm } });
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === 'Enter') {
      const bestMatch = selectBestMatch(searchTerm);
      if (bestMatch) {
        e.preventDefault();
        onChange({ target: { name, value: bestMatch.value } });
        setSearchTerm(bestMatch.label);
      }
    }
  };

  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      {searchable ? (
        <>
          <input
            id={name}
            name={name}
            type="text"
            list={`${name}-options`}
            value={searchTerm}
            onChange={handleSearchChange}
            onBlur={handleSearchBlur}
            onKeyDown={handleSearchKeyDown}
            placeholder={`Type ${label.toLowerCase()}...`}
            className="mb-2 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
            disabled={disabled}
          />
          <datalist id={`${name}-options`}>
            {options.map((option) => (
              <option key={option.value} value={option.label} />
            ))}
          </datalist>
        </>
      ) : (
        <select
          id={name}
          name={name}
          value={value || ''}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
            error
              ? 'border-red-300 text-red-900 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 text-gray-900'
          } ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'}`}
        >
          <option value="" disabled hidden>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default FormSelect;
