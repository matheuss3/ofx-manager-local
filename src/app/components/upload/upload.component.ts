import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BankDbService } from '../../services/bank-db.service';
import { OfxParserService } from '../../services/ofx-parser.service';
import { StoreService } from '../../services/store.service';
import { Source, AccountType } from '../../models/ofx.models';
import { BrlPipe } from '../../pipes/brl.pipe';
import { PeriodFilterComponent } from '../period-filter/period-filter.component';
import { PagamentoModalComponent } from './pagamento-modal.component';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [CommonModule, FormsModule, BrlPipe, PeriodFilterComponent, PagamentoModalComponent],
  templateUrl: './upload.component.html',
})
export class UploadComponent {
  private parser  = inject(OfxParserService);
  private bankDb  = inject(BankDbService);
  protected store: StoreService = inject(StoreService);

  protected isDragging = signal(false);
  protected loading    = signal(false);
  protected loadMsg    = signal('');
  protected progress   = signal(0);

  // Color palette for bank label modal
  protected corPaleta = [
    '#185FA5','#0C447C','#1D9E75','#D85A30','#BA7517','#820AD1',
    '#EC0000','#CC092F','#EC7000','#FF6B00','#00A868','#21C25E',
    '#004990','#006B3F','#1A1A1B','#242424','#003B70','#1B3A6B',
    '#00C244','#00D3C8','#E30613','#004A97','#009A44','#006B3F',
    '#F8DC00','#C8A84B','#FF4081','#00407A','#808080','#595959',
  ];

  // modals
  protected showLabelModal  = signal(false);
  protected showSaldoModal  = signal(false);
  protected showManualModal  = signal(false);
  protected showPagamentoModal = signal(false);

  // label modal state
  protected editingSrcId = signal('');
  protected labelInput   = signal('');
  protected colorInput   = signal('#185FA5');

  // saldo modal state
  protected saldoSrcId   = signal('');
  protected saldoInput   = signal(0);
  protected saldoReason  = signal('');
  protected saldoDesc    = signal('');

  // manual modal state
  protected manualData  = signal(new Date().toISOString().slice(0, 10));
  protected manualTipo  = signal<'CREDIT' | 'DEBIT'>('DEBIT');
  protected manualValor = signal(0);
  protected manualConta = signal('__new');
  protected manualContaNova    = signal('');
  protected manualTipoContaNova = signal<AccountType>('corrente');
  protected manualDesc  = signal('');
  protected manualObs   = signal('');

  protected get sources()    { return this.store.sources(); }
  protected get hiddenIds()  { return this.store.hiddenIds(); }

  protected get multiSource() { return this.sources.length > 1; }
  protected get activeCount() { return this.sources.filter(s => !this.hiddenIds.has(s.id)).length; }

  onDragOver(e: DragEvent) { e.preventDefault(); this.isDragging.set(true); }
  onDragLeave()             { this.isDragging.set(false); }

  async onDrop(e: DragEvent) {
    e.preventDefault(); this.isDragging.set(false);
    const files = Array.from(e.dataTransfer?.files ?? []);
    if (files.length) await this.loadFiles(files);
  }

  async onFileSelect(e: Event) {
    const files = Array.from((e.target as HTMLInputElement).files ?? []);
    if (files.length) await this.loadFiles(files);
    (e.target as HTMLInputElement).value = '';
  }

  async loadFiles(files: File[]) {
    this.loading.set(true);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      this.loadMsg.set(`Lendo: ${f.name}`);
      this.progress.set(Math.round((i / files.length) * 90));
      try {
        const { rows, meta, ofxBalance } = await this.parser.readFile(f);
        const info  = this.bankDb.get(meta.bankId);
        const color = info?.c ?? this.bankDb.colorForIndex(this.sources.length);
        const label = this.bankDb.buildLabel(meta.bankId, meta.acctId, f.name);

        let saldoInicial = 0;
        if (ofxBalance !== null) {
          saldoInicial = ofxBalance - rows.reduce((a, r) => a + r.valor, 0);
        }

        const src: Source = {
          id: `src-${Date.now()}-${Math.random()}`,
          label, color,
          textColor: info?.t ?? '#fff',
          sigla: info?.s ?? label.slice(0, 2).toUpperCase(),
          meta, rows: [], saldoInicial,
          ofxHasBalance: ofxBalance !== null,
          fileName: f.name,
          accountType: 'corrente',
        };
        rows.forEach(r => { (r as any).source = src; });
        src.rows = rows as any;
        this.store.addSource(src);
      } catch (err: any) {
        alert(`Erro ao ler ${f.name}: ${err.message}`);
      }
    }
    this.progress.set(100);
    this.loading.set(false);
  }

  toggleSource(id: string, checked: boolean) { this.store.toggleHidden(id, !checked); }
  selectAll(on: boolean)  { this.store.setAllHidden(!on); }
  removeSource(id: string){ this.store.removeSource(id); }
  clearManual()           { this.store.clearManual(); }
  clearAll()              { if (confirm('Remover tudo?')) this.store.clearAll(); }

  isHidden(id: string)    { return this.hiddenIds.has(id); }
  getSource(id: string)   { return this.sources.find(s => s.id === id); }

  linkedManual(srcId: string) {
    const s = this.sources.find(s => s.id === srcId);
    return (s?.rows ?? []).filter(r => r.isManual && !this.store.deletedIds().has(r.id));
  }

  srcStats(id: string) {
    const s = this.sources.find(s => s.id === id)!;
    const active = s.rows.filter(r => !this.store.deletedIds().has(r.id));
    return {
      active: active.length,
      total: s.rows.length,
      cred: active.filter(r => r.valor > 0).reduce((a, r) => a + r.valor, 0),
      deb:  active.filter(r => r.valor < 0).reduce((a, r) => a + r.valor, 0),
    };
  }

  // ── Label modal ──────────────────────────────────────────────
  openLabelModal(id: string) {
    const s = this.sources.find(s => s.id === id)!;
    this.editingSrcId.set(id);
    this.labelInput.set(s.label);
    this.colorInput.set(s.color);
    this.showLabelModal.set(true);
  }

  saveLabel() {
    const id      = this.editingSrcId();
    const s       = this.sources.find(s => s.id === id)!;
    const oldLabel = s.label;
    const oldColor = s.color;
    const newLabel = this.labelInput();
    const newColor = this.colorInput();

    if (oldLabel === newLabel && oldColor === newColor) {
      this.showLabelModal.set(false);
      return;
    }

    const changes: string[] = [];
    if (oldLabel !== newLabel) changes.push(`nome: "${oldLabel}" → "${newLabel}"`);
    if (oldColor !== newColor) changes.push(`cor: ${oldColor} → ${newColor}`);

    this.store.pushLog({
      type: 'saldo', icon: '🏷',
      title: `Conta renomeada: ${newLabel}`,
      meta: changes.join(' · '),
      undo: () => this.store.updateSourceLabel(id, oldLabel, oldColor),
    });

    this.store.updateSourceLabel(id, newLabel, newColor);
    this.showLabelModal.set(false);
  }

  // ── Saldo modal ──────────────────────────────────────────────
  openSaldoModal(id: string) {
    const s = this.sources.find(s => s.id === id)!;
    this.saldoSrcId.set(id);
    this.saldoInput.set(s.saldoInicial);
    this.saldoReason.set('');
    this.saldoDesc.set(`${s.label} — saldo atual: ${this.store.fBRL(s.saldoInicial)}`);
    this.showSaldoModal.set(true);
  }

  confirmSaldo() {
    const srcId  = this.saldoSrcId();
    const newVal = this.saldoInput();
    const s = this.sources.find(s => s.id === srcId)!;
    const oldVal = s.saldoInicial;
    if (oldVal === newVal) { this.showSaldoModal.set(false); return; }

    this.store.pushLog({
      type: 'saldo', icon: '💰',
      title: `Saldo inicial alterado: ${s.label}`,
      meta: `${this.store.fBRL(oldVal)} → ${this.store.fBRL(newVal)}${this.saldoReason() ? ' · ' + this.saldoReason() : ''}`,
      undo: () => this.store.updateSaldoInicial(srcId, oldVal),
    });
    this.store.updateSaldoInicial(srcId, newVal);
    this.showSaldoModal.set(false);
  }

  // ── Manual entry modal ───────────────────────────────────────
  openManualModal() {
    this.manualData.set(new Date().toISOString().slice(0, 10));
    this.manualTipo.set('DEBIT');
    this.manualValor.set(0);
    this.manualConta.set('__new');
    this.manualContaNova.set('');
    this.manualTipoContaNova.set('corrente');
    this.manualDesc.set('');
    this.manualObs.set('');
    this.showManualModal.set(true);
  }

  addManual() {
    if (!this.manualData() || !this.manualValor() || !this.manualDesc()) {
      alert('Preencha data, valor e descrição.'); return;
    }
    const [y, m, d] = this.manualData().split('-').map(Number);
    const date  = new Date(y, m - 1, d);
    const valor = this.manualTipo() === 'CREDIT' ? +this.manualValor() : -+this.manualValor();
    const contaSel = this.manualConta();

    let src = this.sources.find(s => s.id === contaSel) ?? null;

    // If new account: create a real Source so it gets its own group
    if (contaSel === '__new') {
      const nomeNovo = this.manualContaNova().trim() || 'Conta Manual';
      const newSrc: Source = {
        id: `src-manual-${Date.now()}`,
        label: nomeNovo,
        color: this.bankDb.colorForIndex(this.sources.length),
        textColor: '#fff',
        sigla: nomeNovo.slice(0, 3).toUpperCase(),
        meta: { bankId: '', acctId: '', acctType: '', dtStart: '', dtEnd: '', currency: 'BRL' },
        rows: [], saldoInicial: 0,
        ofxHasBalance: false,
        fileName: '',
        accountType: this.manualTipoContaNova(),
      };
      this.store.addSource(newSrc);
      src = newSrc;
    }

    this.store.addManualRow({
      id: `MNL-${Date.now()}`,
      date, tipo: this.manualTipo(), valor,
      descricao: this.manualDesc() + (this.manualObs() ? ' — ' + this.manualObs() : ''),
      isManual: true,
      source: src,
      linkedSourceId: src?.id ?? null,
      acctLabel: src?.label ?? 'Manual',
    });
    this.showManualModal.set(false);
  }
}
