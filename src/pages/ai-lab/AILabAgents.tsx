import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '@/components/Layout';
import { useAIAgents } from '@/hooks/ai-lab/useAIAgents';
import { AgentCard } from '@/components/ai-lab/AgentCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Plus } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AILabAgents() {
  const { agents, loading, updateAgent, deleteAgent, duplicateAgent } = useAIAgents();
  const { hasRole, isGodMode } = useAuth();
  const isAdmin = hasRole('admin') || isGodMode();
  const navigate = useNavigate();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Collect unique tags
  const allTags = Array.from(new Set(agents.flatMap(a => a.tags || [])));

  const filteredAgents = selectedTag
    ? agents.filter(a => a.tags?.includes(selectedTag))
    : agents;

  const handleDelete = async () => {
    if (!deleteId) return;
    await deleteAgent(deleteId);
    toast({ title: 'Agente excluído' });
    setDeleteId(null);
  };

  const handleDuplicate = async (agent: Parameters<typeof duplicateAgent>[0]) => {
    await duplicateAgent(agent);
    toast({ title: `Agente "${agent.name}" duplicado` });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Agentes</h1>
            <p className="text-muted-foreground">Gerencie os agentes de IA disponíveis</p>
          </div>
          {isAdmin && (
            <Button onClick={() => navigate('/ai-lab/agents/new')}>
              <Plus className="h-4 w-4 mr-2" /> Novo Agente
            </Button>
          )}
        </div>

        {/* Tag filter */}
        {allTags.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            <Badge
              variant={selectedTag === null ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedTag(null)}
            >
              Todos
            </Badge>
            {allTags.map(tag => (
              <Badge
                key={tag}
                variant={selectedTag === tag ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                {tag}
              </Badge>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {loading ? (
            <p className="text-muted-foreground text-center py-10">Carregando...</p>
          ) : (
            filteredAgents.map(a => (
              <AgentCard
                key={a.id}
                agent={a}
                isAdmin={isAdmin}
                onToggle={(id, active) => updateAgent(id, { is_active: active })}
                onEdit={(agent) => navigate(`/ai-lab/agents/${agent.id}/edit`)}
                onDelete={(id) => setDeleteId(id)}
                onDuplicate={handleDuplicate}
              />
            ))
          )}
        </div>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir agente?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O agente será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
