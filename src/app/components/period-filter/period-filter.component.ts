import { Component, inject, signal, computed } from '@angular/core';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-period-filter',
  standalone: true,
  imports: [],
  template: `
    @if (store.sources().length) {
      <div class="period-panel">
        <div class="period-header">
          <span class="period-icon">📅</span>
          <strong>Analisar período</strong>
          @if (isActive()) {
            <span class="period-badge">📌 {{ badgeLabel() }}</span>
          }
          <div class="period-controls">
            <div class="form-group" style="flex-direction:row;align-items:center;gap:6px">
              <label style="white-space:nowrap;font-size:12px;color:var(--muted)">De</label>
              <input type="date" [value]="deVal()" (change)="onDe($any($event.target).value)">
            </div>
            <div class="form-group" style="flex-direction:row;align-items:center;gap:6px">
              <label style="white-space:nowrap;font-size:12px;color:var(--muted)">Até</label>
              <input type="date" [value]="ateVal()" (change)="onAte($any($event.target).value)">
            </div>
            <button class="btn-xs" (click)="clear()">Limpar</button>
            <div class="period-shortcuts">
              <button class="btn-xs" (click)="shortcut('month')">Este mês</button>
              <button class="btn-xs" (click)="shortcut('last')">Mês anterior</button>
              <button class="btn-xs" (click)="shortcut('year')">Este ano</button>
            </div>
          </div>
        </div>
        @if (warning()) {
          <div style="font-size:12px;color:var(--amber);padding:.4rem .9rem .5rem;display:flex;align-items:center;gap:6px">
            <span>⚠</span><span>{{ warning() }}</span>
          </div>
        }
      </div>
    }
  `,
})
export class PeriodFilterComponent {
  protected store: StoreService = inject(StoreService);

  protected deVal  = signal('');
  protected ateVal = signal('');

  protected isActive = computed(() => !!(this.deVal() || this.ateVal()));

  protected badgeLabel = computed(() => {
    const de  = this.deVal()  ? new Date(this.deVal()  + 'T00:00').toLocaleDateString('pt-BR') : 'início';
    const ate = this.ateVal() ? new Date(this.ateVal() + 'T00:00').toLocaleDateString('pt-BR') : 'hoje';
    return `${de} → ${ate}`;
  });

  protected warning = computed(() => {
    if (!this.isActive()) return '';
    const unknowns = this.store.accountGroups().filter(g => g.saldoDesconhecido).map(g => g.label);
    return unknowns.length
      ? `Saldo não calculado para: ${unknowns.join(', ')}. Informe o saldo inicial no painel acima.`
      : '';
  });

  onDe(val: string)  { this.deVal.set(val);  this.apply(); }
  onAte(val: string) { this.ateVal.set(val); this.apply(); }

  clear() {
    this.deVal.set(''); this.ateVal.set('');
    this.store.setPeriod(null, null);
  }

  shortcut(type: 'month' | 'last' | 'year') {
    const now = new Date();
    let de: Date, ate: Date;
    if (type === 'month') {
      de  = new Date(now.getFullYear(), now.getMonth(), 1);
      ate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    } else if (type === 'last') {
      de  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      ate = new Date(now.getFullYear(), now.getMonth(), 0);
    } else {
      de  = new Date(now.getFullYear(), 0, 1);
      ate = new Date(now.getFullYear(), 11, 31);
    }
    this.deVal.set(de.toISOString().slice(0, 10));
    this.ateVal.set(ate.toISOString().slice(0, 10));
    this.apply();
  }

  private apply() {
    const start = this.deVal()  ? new Date(this.deVal()  + 'T00:00:00') : null;
    const end   = this.ateVal() ? new Date(this.ateVal() + 'T23:59:59') : null;
    this.store.setPeriod(start, end);
  }
}
