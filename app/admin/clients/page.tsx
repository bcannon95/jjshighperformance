import { Suspense } from 'react';
import ClientsPage from './ClientsPage';

export default function Page() {
  return (
    <Suspense>
      <ClientsPage />
    </Suspense>
  );
}
