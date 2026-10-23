import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { Link } from 'react-router-dom'; 

import {
  Plus,
} from 'lucide-react';

export function HomePage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title={`Agendamento - Homepage`}
          subtitle="Essa é a página inicial do módulo mfe."
        >
          <Link to="/schedules/tasks">
            <Button size="sm" className="gap-2 shadow-xs">
              <Plus className="h-4 w-4" />
              Nova Tarefa
            </Button>
          </Link>
        </PageHeader>
      </div>
    </div>
  );
}
