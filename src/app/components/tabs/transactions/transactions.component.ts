import { Component, inject, computed } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../../services/store.service';
import { BrlPipe } from '../../../pipes/brl.pipe';
import { Transaction } from '../../../models/ofx.models';
import { signal } from '@angular/core';

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [DatePipe, BrlPipe],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
  private  store:    StoreService = inject(StoreService);
  protected days   = DAYS;

  protected filters  = this.store.txFilters;
  protected sort     = this.store.txSort;
  protected page     = this.store.txPage;
  protected pageSize = this.store.txPageSize;
  protected paged    = this.store.pagedTx;
  protected total    = computed(() => this.store.filteredTx().length);
  protected allLen   = computed(() => this.store.view().length);
  protected pages    = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected sources  = computed(() => this.store.sources());
  protected tags     = computed(() => this.store.tags());

  // Tag dropdown open state — only one open at a time
  protected tagMenuOpen = signal<string | null>(null);
  protected tagMenuPos  = signal<{ top: number; left: number }>({ top: 0, left: 0 });

  protected countLabel = computed(() => {
    const t = this.total(), a = this.allLen();
    return t === a ? `${t} transações` : `${t} de ${a}`;
  });

  protected pageLabel = computed(() => {
    const p = this.page(), size = this.pageSize(), total = this.total();
    const s = (p - 1) * size + 1, e = Math.min(p * size, total);
    return total ? `${s}–${e} de ${total}` : '0';
  });

  onQuery(val: string)   { this.store.setTxFilters({ query: val }); }
  onTipo(val: string)    { this.store.setTxFilters({ tipo: val }); }
  onConta(val: string)   { this.store.setTxFilters({ contaId: val }); }
  onDe(val: string)      { this.store.setTxFilters({ de: val }); }
  onAte(val: string)     { this.store.setTxFilters({ ate: val }); }
  clearFilters()         { this.store.resetTxFilters(); }
  sortBy(col: number)    { this.store.setTxSort(col); }
  changePage(d: number)  { this.store.setPage(this.page() + d); }
  changeSize(val: string){ this.store.setPageSize(+val); }

  sortClass(col: number): string {
    const s = this.sort();
    if (s.col !== col) return '';
    return s.dir === 1 ? 'sa' : 'sd';
  }

  tipoCls(r: Transaction)  { return r.isManual ? 'mn' : r.valor > 0 ? 'cr' : 'db'; }
  tipoLbl(r: Transaction)  { return r.isManual ? 'Manual' : r.valor > 0 ? 'Crédito' : 'Débito'; }
  acctLbl(r: Transaction)  { return r.source?.label ?? r.acctLabel ?? 'Manual'; }
  acctColor(r: Transaction){ return r.source?.color ?? '#BA7517'; }

  tagInfo(r: Transaction) {
    if (!r.tag) return null;
    return this.tags().find(t => t.id === r.tag) ?? null;
  }

  toggleTagMenu(rowId: string, event: MouseEvent) {
    if (this.tagMenuOpen() === rowId) {
      this.tagMenuOpen.set(null);
      return;
    }
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    this.tagMenuPos.set({ top: rect.bottom + 4, left: rect.left });
    this.tagMenuOpen.set(rowId);
  }

  setTag(rowId: string, tagId: string | null) {
    this.store.setRowTag(rowId, tagId);
    this.tagMenuOpen.set(null);
  }

  deleteRow(id: string) {
    const row = this.store.all().find((r: Transaction) => r.id === id);
    if (!row) return;
    this.store.pushLog({
      type: 'delete', icon: '🗑',
      title: `Exclusão: "${row.descricao}"`,
      meta: `${this.acctLbl(row)} · ${row.date.toLocaleDateString('pt-BR')} · ${this.store.fBRL(row.valor)}`,
      undo: () => this.store.restoreRow(id),
    });
    this.store.deleteRow(id);
  }
}
