import { computed, Injectable, signal } from '@angular/core';
import {
  AccountGroup, DescGroup, DayGroup, WeekGroup, AccountType, TagInfo,
  LogEntry, PeriodFilter, Source, Transaction, TxFilters,
} from '../models/ofx.models';

const MAX_LOG = 5;

const DEFAULT_TAGS: TagInfo[] = [
  { id: 'transferencia', label: 'Transferência', color: '#185FA5' },
  { id: 'pagamento',     label: 'Pagamento',     color: '#D85A30' },
  { id: 'recebimento',   label: 'Recebimento',   color: '#1D9E75' },
  { id: 'especial',      label: 'Especial',      color: '#820AD1' },
  { id: 'imposto',       label: 'Imposto',       color: '#BA7517' },
  { id: 'folha',         label: 'Folha de pagamento', color: '#0C447C' },
];
const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

@Injectable({ providedIn: 'root' })
export class StoreService {

  // ── Raw state ───────────────────────────────────────────────
  readonly sources    = signal<Source[]>([]);
  readonly deletedIds = signal<Set<string>>(new Set());
  readonly hiddenIds  = signal<Set<string>>(new Set());
  readonly period     = signal<PeriodFilter>({ start: null, end: null });
  readonly log        = signal<LogEntry[]>([]);
  readonly tags       = signal<TagInfo[]>([...DEFAULT_TAGS]);

  readonly txFilters = signal<TxFilters>({
    query: '', tipo: '', contaId: '', de: '', ate: '',
  });

  readonly txSort = signal<{ col: number; dir: 1 | -1 }>({ col: 1, dir: 1 });
  readonly txPage = signal(1);
  readonly txPageSize = signal(50);

  // ── ALL: every non-deleted, non-hidden transaction ──────────
  readonly all = computed<Transaction[]>(() => {
    const deleted = this.deletedIds();
    const hidden  = this.hiddenIds();
    const rows: Transaction[] = [];
    for (const s of this.sources()) {
      if (hidden.has(s.id)) continue;
      for (const r of s.rows) {
        if (!deleted.has(r.id)) rows.push(r);
      }
    }
    return rows.sort((a, b) => +a.date - +b.date);
  });

  // ── VIEW: ALL filtered by period ────────────────────────────
  readonly view = computed<Transaction[]>(() => {
    const { start, end } = this.period();
    if (!start && !end) return this.all();
    return this.all().filter(r => {
      if (start && r.date < start) return false;
      if (end   && r.date > end)   return false;
      return true;
    });
  });

  // ── Account groups (period-aware saldo) ─────────────────────
  readonly accountGroups = computed<AccountGroup[]>(() => {
    const { start } = this.period();
    const deleted   = this.deletedIds();
    const hidden    = this.hiddenIds();
    const groups: AccountGroup[] = [];

    for (const s of this.sources()) {
      if (hidden.has(s.id)) continue;
      const allSrcRows = s.rows.filter(r => !deleted.has(r.id));
      const viewRows   = allSrcRows.filter(r => this.inPeriod(r.date));
      const beforeRows = start ? allSrcRows.filter(r => r.date < start) : [];
      const beforeSum  = beforeRows.reduce((a, r) => a + r.valor, 0);
      const saldoInicial = s.saldoInicial + beforeSum;
      const saldoDesconhecido = !s.ofxHasBalance && s.saldoInicial === 0
        && beforeRows.length === 0 && !!start;
      const g: AccountGroup = {
        id: s.id, label: s.label, color: s.color, accountType: s.accountType,
        n: viewRows.length, cred: 0, deb: 0,
        rows: viewRows, allRows: allSrcRows,
        saldoInicial, saldoDesconhecido,
      };
      for (const r of viewRows) r.valor > 0 ? (g.cred += r.valor) : (g.deb += r.valor);
      groups.push(g);
    }
    return groups;
  });

  // ── Derived: day / week / desc ──────────────────────────────
  readonly dayGroups = computed<DayGroup[]>(() => {
    const map = new Map<string, DayGroup>();
    for (const r of this.view()) {
      const k = this.fDate(r.date);
      if (!map.has(k)) map.set(k, { date: r.date, cred: 0, deb: 0, n: 0 });
      const g = map.get(k)!;
      r.valor > 0 ? (g.cred += r.valor) : (g.deb += r.valor);
      g.n++;
    }
    return [...map.values()];
  });

  readonly weekGroups = computed<WeekGroup[]>(() => {
    const map = new Map<string, WeekGroup>();
    for (const r of this.view()) {
      const d   = r.date;
      const jan = new Date(d.getFullYear(), 0, 1);
      const wk  = Math.ceil(((+d - +jan) / 86400000 + jan.getDay() + 1) / 7);
      const k   = `Sem ${String(wk).padStart(2, '0')}/${d.getFullYear()}`;
      if (!map.has(k)) map.set(k, { key: k, cred: 0, deb: 0, n: 0 });
      const g = map.get(k)!;
      r.valor > 0 ? (g.cred += r.valor) : (g.deb += r.valor);
      g.n++;
    }
    return [...map.values()];
  });

  readonly descGroups = computed<DescGroup[]>(() => {
    const map = new Map<string, DescGroup>();
    for (const r of this.view()) {
      if (!map.has(r.descricao)) {
        map.set(r.descricao, { label: r.descricao, n: 0, total: 0, cred: 0, deb: 0, rows: [] });
      }
      const g = map.get(r.descricao)!;
      g.n++; g.total += r.valor;
      r.valor > 0 ? (g.cred += r.valor) : (g.deb += r.valor);
      g.rows.push(r);
    }
    return [...map.values()];
  });

  // ── KPI totals ───────────────────────────────────────────────
  readonly totals = computed(() => {
    const v = this.view();
    const totalIn  = v.filter(r => r.valor > 0).reduce((a, r) => a + r.valor, 0);
    const totalOut = v.filter(r => r.valor < 0).reduce((a, r) => a + r.valor, 0);
    const groups   = this.accountGroups();
    const ccGroups  = groups.filter(g => g.accountType !== 'investimento');
    const invGroups = groups.filter(g => g.accountType === 'investimento');
    const anyUnknownCC  = ccGroups.some(g => g.saldoDesconhecido);
    const anyUnknownInv = invGroups.some(g => g.saldoDesconhecido);
    const totalSaldo    = anyUnknownCC  ? null : ccGroups.reduce((a, g) => a + g.saldoInicial + g.cred + g.deb, 0);
    const saldoCC       = totalSaldo;
    const saldoInvest   = anyUnknownInv ? null : invGroups.reduce((a, g) => a + g.saldoInicial + g.cred + g.deb, 0);
    const saldoGeral    = saldoCC === null || saldoInvest === null ? null : saldoCC + saldoInvest;
    const dates = v.map(r => r.date).sort((a, b) => +a - +b);
    return { totalIn, totalOut, net: totalIn + totalOut, count: v.length, totalSaldo, saldoCC, saldoInvest, saldoGeral, dates };
  });

  // ── Filtered + sorted transactions for the table ────────────
  readonly filteredTx = computed<Transaction[]>(() => {
    const f = this.txFilters();
    const q = f.query.toLowerCase();
    let rows = this.view().filter(r => {
      const tipo = r.isManual ? 'Manual' : r.valor > 0 ? 'Crédito' : 'Débito';
      if (f.tipo && tipo !== f.tipo) return false;
      if (f.contaId) {
        if (f.contaId && r.source?.id !== f.contaId) return false;
      }
      if (q && !r.descricao.toLowerCase().includes(q) &&
          !String(Math.abs(r.valor)).includes(q) &&
          !(r.source?.label.toLowerCase().includes(q))) return false;
      if (f.de && this.fISO(r.date) < f.de) return false;
      if (f.ate && this.fISO(r.date) > f.ate) return false;
      return true;
    });

    const { col, dir } = this.txSort();
    rows = [...rows].sort((a, b) => {
      let va: any, vb: any;
      switch (col) {
        case 1: va = a.date; vb = b.date; break;
        case 2: va = DAYS[a.date.getDay()]; vb = DAYS[b.date.getDay()]; break;
        case 3: va = a.source?.label ?? ''; vb = b.source?.label ?? ''; break;
        case 4: va = a.isManual ? 'Manual' : a.valor > 0 ? 'Crédito' : 'Débito';
                vb = b.isManual ? 'Manual' : b.valor > 0 ? 'Crédito' : 'Débito'; break;
        case 5: va = a.descricao; vb = b.descricao; break;
        case 6: va = a.valor; vb = b.valor; break;
        default: va = +a.date; vb = +b.date;
      }
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
    });
    return rows;
  });

  readonly pagedTx = computed(() => {
    const page = this.txPage();
    const size = this.txPageSize();
    const all  = this.filteredTx();
    return { rows: all.slice((page - 1) * size, page * size), total: all.length };
  });

  // ── Active log entries ───────────────────────────────────────
  readonly activeLog = computed(() => this.log().filter(e => !e.undone));

  // ── Mutations ────────────────────────────────────────────────
  addSource(source: Source) {
    this.sources.update(list => {
      const existing = list.find(s => s.meta.acctId && s.meta.acctId === source.meta.acctId);
      if (existing) {
        const existIds = new Set(existing.rows.map(r => r.id));
        const newRows = source.rows.filter(r => !existIds.has(r.id));
        newRows.forEach(r => r.source = existing);
        return list.map(s => s === existing ? { ...s, rows: [...s.rows, ...newRows] } : s);
      }
      return [...list, source];
    });
  }

  removeSource(id: string) {
    this.sources.update(list => list.filter(s => s.id !== id));
  }

  updateAccountType(id: string, type: AccountType) {
    this.sources.update(list => list.map(s => s.id === id ? { ...s, accountType: type } : s));
  }

  updateSourceLabel(id: string, label: string, color: string) {
    this.sources.update(list => list.map(s => {
      if (s.id !== id) return s;
      const sigla = label.slice(0, 3).toUpperCase().trim();
      const updated = { ...s, label, color, sigla };
      // Update source reference on all rows so r.source?.color stays current
      updated.rows = s.rows.map(r => ({ ...r, source: updated }));
      return updated;
    }));
  }

  updateSaldoInicial(srcId: string, newVal: number) {
    this.sources.update(list => list.map(s => s.id === srcId ? { ...s, saldoInicial: newVal } : s));
  }

  addManualRow(row: Transaction) {
    if (row.linkedSourceId) {
      // Add directly to the source rows so it's counted in balance
      this.sources.update(list => list.map(s => {
        if (s.id !== row.linkedSourceId) return s;
        const updated = { ...s, rows: [...s.rows, { ...row, source: s }] };
        return updated;
      }));
    }
    // Always keep a reference in a flat list for undo/delete via id
    // We use sources as the single source of truth now
  }

  clearManual() {
    // Remove all manual rows from all sources
    this.sources.update(list => list.map(s => ({
      ...s,
      rows: s.rows.filter(r => !r.isManual),
    })));
  }

  deleteRow(id: string) {
    this.deletedIds.update(set => new Set([...set, id]));
  }

  restoreRow(id: string) {
    this.deletedIds.update(set => { const n = new Set(set); n.delete(id); return n; });
  }

  toggleHidden(id: string, hidden: boolean) {
    this.hiddenIds.update(set => {
      const n = new Set(set);
      hidden ? n.add(id) : n.delete(id);
      return n;
    });
  }

  setAllHidden(hidden: boolean) {
    this.hiddenIds.set(hidden ? new Set(this.sources().map(s => s.id)) : new Set());
  }

  setPeriod(start: Date | null, end: Date | null) {
    this.period.set({ start, end });
  }

  setTxFilters(patch: Partial<TxFilters>) {
    this.txFilters.update(f => ({ ...f, ...patch }));
    this.txPage.set(1);
  }

  resetTxFilters() {
    this.txFilters.set({ query: '', tipo: '', contaId: '', de: '', ate: '' });
    this.txPage.set(1);
  }

  setTxSort(col: number) {
    this.txSort.update(s => ({ col, dir: s.col === col ? (s.dir === 1 ? -1 : 1) as 1 | -1 : 1 }));
  }

  setPage(page: number)     { this.txPage.set(page); }
  setPageSize(size: number) { this.txPageSize.set(size); this.txPage.set(1); }

  pushLog(entry: Omit<LogEntry, 'id' | 'ts' | 'undone'>) {
    this.log.update(list => {
      let active = list.filter(e => !e.undone);
      if (active.length >= MAX_LOG) {
        const oldest = list.find(e => !e.undone);
        if (oldest) list = list.filter(e => e !== oldest);
      }
      return [{ ...entry, id: `log-${Date.now()}`, ts: new Date(), undone: false }, ...list];
    });
  }

  undoLog(id: string) {
    const entry = this.log().find(e => e.id === id);
    if (!entry || entry.undone) return;
    entry.undo();
    this.log.update(list => list.map(e => e.id === id ? { ...e, undone: true } : e));
  }

  clearAll() {
    this.sources.set([]);
    this.deletedIds.set(new Set());
    this.hiddenIds.set(new Set());
    this.log.set([]);
  }

  // ── Tags ─────────────────────────────────────────────────────
  addTag(label: string, color: string) {
    const id = label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    this.tags.update(list => list.some(t => t.id === id) ? list : [...list, { id, label, color }]);
    return id;
  }

  removeTag(id: string) {
    this.tags.update(list => list.filter(t => t.id !== id));
    // Clear tag from any transactions using it
    this.setTagOnRows(id, null);
  }

  setRowTag(rowId: string, tagId: string | null) {
    this.sources.update(list => list.map(s => ({
      ...s,
      rows: s.rows.map(r => r.id === rowId ? { ...r, tag: tagId } : r),
    })));
  }

  private setTagOnRows(tagId: string, newVal: string | null) {
    this.sources.update(list => list.map(s => ({
      ...s,
      rows: s.rows.map(r => r.tag === tagId ? { ...r, tag: newVal } : r),
    })));
  }

  // ── Helpers ──────────────────────────────────────────────────
  inPeriod(date: Date): boolean {
    const { start, end } = this.period();
    if (start && date < start) return false;
    if (end   && date > end)   return false;
    return true;
  }

  fDate(d: Date): string { return d.toLocaleDateString('pt-BR'); }
  fISO(d: Date): string  { return d.toISOString().slice(0, 10); }
  fBRL(v: number): string {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }
}
