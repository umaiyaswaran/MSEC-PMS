import { useState } from 'react';
import SearchInput from '../Inputs/SearchInput';
import FormSelect from '../Forms/FormSelect';
import Button from '../Buttons/Button';

const SearchBar = ({ filters = [], onSearch, onFilterChange }) => {
  const [searchValue, setSearchValue] = useState('');
  const [filterValues, setFilterValues] = useState({});

  const handleSearchChange = (value) => {
    setSearchValue(value);
    onSearch(value);
  };

  const handleFilterChange = (name, value) => {
    setFilterValues((prev) => ({
      ...prev,
      [name]: value,
    }));
    onFilterChange(name, value);
  };

  const handleClearFilters = () => {
    setSearchValue('');
    setFilterValues({});
    onSearch('');
    filters.forEach((filter) => {
      onFilterChange(filter.name, '');
    });
  };

  const hasActiveFilters = searchValue || Object.values(filterValues).some((v) => v);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            value={searchValue}
            onChange={handleSearchChange}
            placeholder="Search..."
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {filters.map((filter) => (
            <div key={filter.name} className="w-48">
              <FormSelect
                name={filter.name}
                value={filterValues[filter.name] || ''}
                onChange={(e) => handleFilterChange(filter.name, e.target.value)}
                options={filter.options}
                placeholder={filter.placeholder || 'All'}
              />
            </div>
          ))}

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={handleClearFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
