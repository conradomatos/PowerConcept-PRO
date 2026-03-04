import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Plus, Check, X, History } from 'lucide-react';
import { useMaterialVariants, type MaterialVariant } from '@/hooks/orcamentos/useMaterialVariants';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface MaterialVariantsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  catalogId: string | null;
  catalogCodigo: string;
  catalogDescricao: string;
}

interface PriceHistoryItem {
  id: string;
  old_price: number;
  new_price: number;
  changed_at: string;
}

export function MaterialVariantsDrawer({
  open,
  onOpenChange,
  catalogId,
  catalogCodigo,
  catalogDescricao,
}: MaterialVariantsDrawerProps) {
  const { hasRole, isGodMode } = useAuth();
  const { variants, isLoading, createVariant, updateVariant, deleteVariant } = useMaterialVariants(catalogId);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFabricante, setNewFabricante] = useState('');
  const [newSku, setNewSku] = useState('');
  const [newPreco, setNewPreco] = useState('');
  
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [editPreco, setEditPreco] = useState('');
  
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null);

  const canEditPrice = hasRole('admin') || hasRole('financeiro') || isGodMode();

  // Fetch price history for selected variant
  const { data: priceHistory = [] } = useQuery({
    queryKey: ['variant-price-history', selectedVariantId],
    queryFn: async () => {
      if (!selectedVariantId) return [];
      const { data, error } = await supabase
        .from('material_variant_price_history')
        .select('id, old_price, new_price, changed_at')
        .eq('variant_id', selectedVariantId)
        .order('changed_at', { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as PriceHistoryItem[];
    },
    enabled: !!selectedVariantId && historyDialogOpen,
  });

  const handleAddVariant = async () => {
    if (!newFabricante.trim()) return;
    
    const preco = parseFloat(newPreco.replace(',', '.')) || 0;
    
    await createVariant.mutateAsync({
      fabricante: newFabricante.trim(),
      sku: newSku.trim() || null,
      preco_ref: preco,
    });
    
    setNewFabricante('');
    setNewSku('');
    setNewPreco('');
    setShowAddForm(false);
  };

  const handleStartEdit = (variant: MaterialVariant) => {
    setEditingVariantId(variant.id);
    setEditPreco(variant.preco_ref.toString().replace('.', ','));
  };

  const handleSaveEdit = async (variantId: string) => {
    const preco = parseFloat(editPreco.replace(',', '.')) || 0;
    await updateVariant.mutateAsync({ id: variantId, preco_ref: preco });
    setEditingVariantId(null);
    setEditPreco('');
  };

  const handleCancelEdit = () => {
    setEditingVariantId(null);
    setEditPreco('');
  };

  const handleShowHistory = (variantId: string) => {
    setSelectedVariantId(variantId);
    setHistoryDialogOpen(true);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[500px] sm:w-[600px] sm:max-w-[600px]">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              Fabricantes / Preços
            </SheetTitle>
            <SheetDescription className="space-y-1">
              <div className="font-mono text-sm">{catalogCodigo}</div>
              <div className="text-xs">{catalogDescricao}</div>
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
            {/* Variants table */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[180px]">Fabricante</TableHead>
                    <TableHead className="w-[100px]">SKU</TableHead>
                    <TableHead className="w-[120px] text-right">Preço Ref</TableHead>
                    <TableHead className="w-[100px]">Atualizado</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : variants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Nenhum fabricante cadastrado
                      </TableCell>
                    </TableRow>
                  ) : (
                    variants.map((variant) => (
                      <TableRow key={variant.id}>
                        <TableCell className="font-medium">{variant.fabricante}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {variant.sku || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingVariantId === variant.id ? (
                            <div className="flex items-center justify-end gap-1">
                              <Input
                                value={editPreco}
                                onChange={(e) => setEditPreco(e.target.value)}
                                className="h-7 w-24 text-right text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEdit(variant.id);
                                  if (e.key === 'Escape') handleCancelEdit();
                                }}
                              />
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => handleSaveEdit(variant.id)}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleCancelEdit}
                              >
                                <X className="h-3 w-3 text-muted-foreground" />
                              </Button>
                            </div>
                          ) : (
                            <span
                              className={canEditPrice ? 'cursor-pointer hover:text-primary' : ''}
                              onClick={() => canEditPrice && handleStartEdit(variant)}
                            >
                              {formatCurrency(variant.preco_ref)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(variant.updated_at), 'dd/MM/yy', { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleShowHistory(variant.id)}
                              title="Ver histórico de preços"
                            >
                              <History className="h-3.5 w-3.5 text-muted-foreground" />
                            </Button>
                            {isGodMode() && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => deleteVariant.mutate(variant.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Add new form */}
            {showAddForm ? (
              <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Fabricante *</Label>
                    <Input
                      value={newFabricante}
                      onChange={(e) => setNewFabricante(e.target.value)}
                      placeholder="Ex: WEG, ABB, Siemens"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <Input
                      value={newSku}
                      onChange={(e) => setNewSku(e.target.value)}
                      placeholder="Opcional"
                      className="h-8"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Preço Ref</Label>
                    <Input
                      value={newPreco}
                      onChange={(e) => setNewPreco(e.target.value)}
                      placeholder="0,00"
                      className="h-8 text-right"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(false)}>
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddVariant}
                    disabled={!newFabricante.trim() || createVariant.isPending}
                  >
                    Adicionar
                  </Button>
                </div>
              </div>
            ) : canEditPrice && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(true)}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Fabricante
              </Button>
            )}

            {/* Info badges */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {variants.length > 0 && (
                <Badge variant="secondary">
                  {variants.length} fabricante{variants.length !== 1 ? 's' : ''}
                </Badge>
              )}
              {variants.length > 0 && (
                <span>
                  Menor preço: {formatCurrency(Math.min(...variants.map(v => v.preco_ref)))}
                </span>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Price History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Histórico de Preços</DialogTitle>
            <DialogDescription>
              Últimas alterações de preço para este fabricante
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[300px] overflow-y-auto">
            {priceHistory.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">
                Nenhum histórico encontrado
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead className="text-right">Anterior</TableHead>
                    <TableHead className="text-right">Novo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {priceHistory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-sm">
                        {format(new Date(item.changed_at), 'dd/MM/yy HH:mm', { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {formatCurrency(item.old_price)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        {formatCurrency(item.new_price)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
