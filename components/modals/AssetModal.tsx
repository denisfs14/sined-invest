'use client';

import { useEffect, useState } from 'react';
import { Asset, AssetClass } from '@/types';
import { Modal, ModalFooter, Button, FormGroup, Input, Select, Toggle, C } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (d: Omit<Asset, 'id'>, h: { quantity: number; avg_price: number }) => void;
  onUpdate?: (id: string, d: Partial<Asset>, h: { quantity: number; avg_price: number }) => void;
  classes: AssetClass[];
  portfolioId: string;
  defaultMaxPct: number;
  editAsset?: Asset & { holding?: { quantity: number; avg_price: number } };
}

const blank = {
  ticker: '', name: '', asset_class_id: '', current_price: '',
  target_percentage: '', max_percentage: '', quantity: '', avg_price: '',
  is_red: false,
};

export function AssetModal({ open, onClose, onSave, onUpdate, classes, portfolioId, defaultMaxPct, editAsset }: Props) {
  const [f, setF] = useState({ ...blank });

  useEffect(() => {
    if (editAsset) {
      setF({
        ticker: editAsset.ticker,
        name: editAsset.name,
        asset_class_id: editAsset.asset_class_id ?? '',
        current_price: String(editAsset.current_price),
        target_percentage: String(editAsset.target_percentage),
        max_percentage: String(editAsset.max_percentage || defaultMaxPct),
        quantity: String(editAsset.holding?.quantity ?? 0),
        avg_price: String(editAsset.holding?.avg_price ?? 0),
        is_red: editAsset.is_red,
      });
    } else {
      setF({ ...blank, max_percentage: String(defaultMaxPct) });
    }
  }, [editAsset, open, defaultMaxPct]);

  const set = (k: string, v: string | boolean) => setF(p => ({ ...p, [k]: v }));

  function handle() {
    if (!f.ticker.trim()) return alert('Informe o ticker');
    const price = parseFloat(f.current_price);
    if (!price || price <= 0) return alert('Preço inválido');

    const data: Omit<Asset, 'id'> = {
      portfolio_id: portfolioId,
      asset_class_id: f.asset_class_id || null,
      ticker: f.ticker.toUpperCase().trim(),
      name: f.name.trim(),
      current_price: price,
      target_percentage: parseFloat(f.target_percentage) || 0,
      max_percentage: parseFloat(f.max_percentage) || defaultMaxPct,
      is_red: f.is_red,
      active: true,
    };
    const holding = {
      quantity: parseFloat(f.quantity) || 0,
      avg_price: parseFloat(f.avg_price) || price,
    };

    if (editAsset && onUpdate) onUpdate(editAsset.id, data, holding);
    else onSave(data, holding);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}
      title={editAsset ? 'Editar Ativo' : 'Adicionar Ativo'}
      subtitle={editAsset ? 'Atualize os dados do ativo' : 'Cadastre um novo ativo na carteira'}
      width={560}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label="Ticker *">
            <Input placeholder="PETR4" value={f.ticker} onChange={e => set('ticker', e.target.value.toUpperCase())} />
          </FormGroup>
          <FormGroup label="Nome">
            <Input placeholder="Petrobras PN" value={f.name} onChange={e => set('name', e.target.value)} />
          </FormGroup>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label="Classe">
            <Select value={f.asset_class_id} onChange={e => set('asset_class_id', e.target.value)}>
              <option value="">— Sem classe —</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </FormGroup>
          <FormGroup label="Preço Atual (R$) *">
            <Input type="number" min="0" step="0.01" placeholder="32.50"
              value={f.current_price} onChange={e => set('current_price', e.target.value)} />
          </FormGroup>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <FormGroup label="% Alvo">
            <Input type="number" min="0" max="100" step="0.1" placeholder="10"
              value={f.target_percentage} onChange={e => set('target_percentage', e.target.value)} />
          </FormGroup>
          <FormGroup label="% Máximo">
            <Input type="number" min="0" max="100" step="0.1"
              value={f.max_percentage} onChange={e => set('max_percentage', e.target.value)} />
          </FormGroup>
          <FormGroup label="Qtd. em Carteira">
            <Input type="number" min="0" step="1" placeholder="100"
              value={f.quantity} onChange={e => set('quantity', e.target.value)} />
          </FormGroup>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label="Preço Médio (R$)">
            <Input type="number" min="0" step="0.01" placeholder="30.00"
              value={f.avg_price} onChange={e => set('avg_price', e.target.value)} />
          </FormGroup>
          <FormGroup label="Status">
            <div style={{ paddingTop: '9px' }}>
              <Toggle value={f.is_red} onChange={v => set('is_red', v)} label="🔴 Ativo Vermelho" />
            </div>
          </FormGroup>
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handle}>{editAsset ? 'Atualizar' : 'Salvar Ativo'}</Button>
      </ModalFooter>
    </Modal>
  );
}
