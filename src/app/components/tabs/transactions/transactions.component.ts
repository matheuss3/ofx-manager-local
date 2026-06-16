import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../../services/store.service';
import { BrlPipe } from '../../../pipes/brl.pipe';

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, BrlPipe],
  templateUrl: './transactions.component.html',
})
export class TransactionsComponent {
  protected store: StoreService = inject(StoreService);
  protected days   = DAYS;

  protected filters  = this.store.txFilters;
  protected sort     = this.store.txSort;
  protected page     = this.store.txPage;
  protected pageSize = this.store.txPageSize;
  protected paged    = this.store.pagedTx;
  protected total    = computed(() => this.store.filteredTx().length);
  protected allLen   = computed(() => this.store.view().length);
  protected pages    = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));

  protected sources = computed(() => this.store.sources());

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

  tipoCls(r: any)  { return r.isManual ? 'mn' : r.valor > 0 ? 'cr' : 'db'; }
  tipoLbl(r: any)  { return r.isManual ? 'Manual' : r.valor > 0 ? 'Crédito' : 'Débito'; }
  acctLbl(r: any)  { return r.source?.label ?? r.acctLabel ?? 'Manual'; }
  acctColor(r: any){ return r.source?.color ?? '#BA7517'; }

  deleteRow(id: string) {
    const all = this.store.all();
    const row = (all as any[]).find((r:any) => r.id === id);
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
