'use client';

import { useEffect, useState } from 'react';
import { Asset, DividendEvent } from '@/types';
import { Modal, ModalFooter, Button, FormGroup, Input, Select, C } from '@/components/ui';

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (d: Omit<DividendEvent, 'id'>) => void;
  onUpdate?: (id: string, d: Partial<DividendEvent>) => void;
  assets: Asset[];
  portfolioId: string;
  edit?: DividendEvent;
}

const blank = {
  asset_id: '', ex_date: '', payment_date: '',
  expected_amount: '', received_amount: '', status: 'expected' as DividendEvent['status'],
};

export function DividendModal({ open, onClose, onSave, onUpdate, assets, portfolioId, edit }: Props) {
  const [f, setF] = useState({ ...blank });

  useEffect(() => {
    if (edit) {
      setF({
        asset_id: edit.asset_id,
        ex_date: edit.ex_date,
        payment_date: edit.payment_date,
        expected_amount: String(edit.expected_amount),
        received_amount: String(edit.received_amount),
        status: edit.status,
      });
    } else {
      setF({ ...blank });
    }
  }, [edit, open]);

  const set = (k: string, v: string) => setF(p => ({ ...p, [k]: v }));

  function handle() {
    if (!f.asset_id) return alert('Selecione o ativo');
    if (!f.payment_date) return alert('Informe a data de pagamento');

    const data: Omit<DividendEvent, 'id'> = {
      asset_id: f.asset_id,
      portfolio_id: portfolioId,
      ex_date: f.ex_date,
      payment_date: f.payment_date,
      expected_amount: parseFloat(f.expected_amount) || 0,
      received_amount: parseFloat(f.received_amount) || 0,
      status: f.status,
    };

    if (edit && onUpdate) onUpdate(edit.id, data);
    else onSave(data);
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose}
      title={edit ? 'Editar Provento' : 'Registrar Provento'}
      subtitle="Dividendos, JCP, rendimentos de FIIs" width={500}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

        <FormGroup label="Ativo *">
          <Select value={f.asset_id} onChange={e => set('asset_id', e.target.value)}>
            <option value="">— Selecione o ativo —</option>
            {assets.map(a => <option key={a.id} value={a.id}>{a.ticker} · {a.name}</option>)}
          </Select>
        </FormGroup>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label="Data Ex">
            <Input type="date" value={f.ex_date} onChange={e => set('ex_date', e.target.value)} />
          </FormGroup>
          <FormGroup label="Data Pagamento *">
            <Input type="date" value={f.payment_date} onChange={e => set('payment_date', e.target.value)} />
          </FormGroup>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <FormGroup label="Valor Esperado (R$)">
            <Input type="number" min="0" step="0.01" placeholder="0.00"
              value={f.expected_amount} onChange={e => set('expected_amount', e.target.value)} />
          </FormGroup>
          <FormGroup label="Valor Recebido (R$)">
            <Input type="number" min="0" step="0.01" placeholder="0.00"
              value={f.received_amount} onChange={e => set('received_amount', e.target.value)} />
          </FormGroup>
        </div>

        <FormGroup label="Status">
          <Select value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="expected">Esperado</option>
            <option value="pending">Pendente</option>
            <option value="received">Recebido</option>
            <option value="canceled">Cancelado</option>
          </Select>
        </FormGroup>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" onClick={handle}>{edit ? 'Atualizar' : 'Salvar Provento'}</Button>
      </ModalFooter>
    </Modal>
  );
}
