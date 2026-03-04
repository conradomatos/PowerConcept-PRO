import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, Package, FolderTree, DollarSign } from 'lucide-react';
import { MaterialCatalogGrid } from '@/components/orcamentos/bases/MaterialCatalogGrid';
import { MaterialImportModal } from '@/components/orcamentos/bases/MaterialImportModal';
import { MaterialHierarchyManager } from '@/components/orcamentos/bases/MaterialHierarchyManager';
import { PriceContextSelector } from '@/components/orcamentos/bases/PriceContextSelector';
import { useMaterialCatalog } from '@/hooks/orcamentos/useMaterialCatalog';
import { useAuth } from '@/hooks/useAuth';

export default function CatalogoMateriais() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('catalogo');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [regiaoId, setRegiaoId] = useState<string | null>(null);
  
  const { items } = useMaterialCatalog();
  const { hasRole, isGodMode } = useAuth();

  const canImport = hasRole('admin') || hasRole('financeiro') || isGodMode();

  const handleImportSuccess = () => {
    // Grid will auto-refresh via react-query
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6" />
            Catálogo de Materiais
          </h1>
          <p className="text-muted-foreground">
            Base global de materiais com preços e HH de referência
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canImport && activeTab === 'catalogo' && (
            <Button onClick={() => setImportModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
          )}
        </div>
      </div>

      {/* Price Context Selector */}
      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <DollarSign className="h-4 w-4" />
          <span>Contexto de Preços:</span>
        </div>
        <PriceContextSelector
          empresaId={empresaId}
          regiaoId={regiaoId}
          onEmpresaChange={setEmpresaId}
          onRegiaoChange={setRegiaoId}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="catalogo" className="gap-2">
            <Package className="h-4 w-4" />
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="hierarquia" className="gap-2">
            <FolderTree className="h-4 w-4" />
            Gerenciar Hierarquia
          </TabsTrigger>
        </TabsList>

        <TabsContent value="catalogo" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Materiais Cadastrados</CardTitle>
                  <CardDescription>
                    {items.length} materiais disponíveis para uso em orçamentos
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <MaterialCatalogGrid 
                empresaId={empresaId} 
                regiaoId={regiaoId}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hierarquia" className="mt-4">
          <MaterialHierarchyManager />
        </TabsContent>
      </Tabs>

      <MaterialImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        onSuccess={handleImportSuccess}
      />
    </div>
  );
}
