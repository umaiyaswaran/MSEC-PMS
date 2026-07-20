import { useState, useCallback } from 'react';

const usePagination = (initialLimit = 10) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [limit] = useState(initialLimit);

  const params = {
    page: currentPage,
    limit,
  };

  const setTotal = useCallback((totalItems) => {
    const pages = Math.ceil(totalItems / limit);
    setTotalPages(pages > 0 ? pages : 1);
  }, [limit]);

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev < totalPages) {
        return prev + 1;
      }
      return prev;
    });
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const goToPage = useCallback((page) => {
    const pageNum = Math.max(1, Math.min(page, totalPages));
    setCurrentPage(pageNum);
  }, [totalPages]);

  return {
    currentPage,
    totalPages,
    limit,
    params,
    nextPage,
    prevPage,
    goToPage,
    setTotal,
  };
};

export default usePagination;
