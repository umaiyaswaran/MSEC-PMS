import { useLocation } from 'react-router-dom';

const useNavPrefix = () => {
  const { pathname } = useLocation();

  if (pathname.startsWith('/admin')) return '/admin';
  if (pathname.startsWith('/manager')) return '/manager';
  if (pathname.startsWith('/store-manager')) return '/store-manager';
  return '';
};

export default useNavPrefix;
