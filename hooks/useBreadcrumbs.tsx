import React, { createContext, useState, useContext, useCallback } from 'react';

export type Breadcrumb = {
  label: string;
  path?: string;
};

type BreadcrumbContextType = {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
};

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  breadcrumbs: [],
  setBreadcrumbs: () => {},
});

export const BreadcrumbProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);

  const handleSetBreadcrumbs = useCallback((crumbs: Breadcrumb[]) => {
    setBreadcrumbs(crumbs);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs: handleSetBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
};

export const useBreadcrumbs = () => useContext(BreadcrumbContext);
