import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { BrlPipe } from '../../pipes/brl.pipe';

@Component({
  selector: 'app-kpi-grid',
  standalone: true,
  imports: [CommonModule, BrlPipe],
  template: `
    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-lbl">Período</div>
        <div class="kpi-val sm">{{ periodLabel() }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Transações</div>
        <div class="kpi-val blue">{{ t().count }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Total entradas</div>
        <div class="kpi-val green">{{ t().totalIn | brl }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Total saídas</div>
        <div class="kpi-val red">{{ t().totalOut * -1 | brl }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Resultado líquido</div>
        <div class="kpi-val" [class.green]="t().net >= 0" [class.red]="t().net < 0">{{ t().net | brl }}</div>
      </div>
      <div class="kpi">
        <div class="kpi-lbl">Saldo total atual</div>
        @if (t().totalSaldo === null) {
          <div class="kpi-val" style="color:var(--amber);font-size:13px">⚠ não calculado</div>
        } @else {
          <div class="kpi-val" [class.green]="t().totalSaldo! >= 0" [class.red]="t().totalSaldo! < 0">{{ t().totalSaldo | brl }}</div>
        }
      </div>
    </div>

    <!-- Indicators -->
    <div class="slabel" style="margin-top:1.5rem">Indicadores adicionais</div>
    <div class="ind-grid">
      @for (ind of indicators(); track ind.label) {
        <div class="ind-row"
             [style.border-left]="ind.highlight === 'cc' ? '3px solid var(--blue)' : ind.highlight === 'inv' ? '3px solid var(--green)' : ind.highlight === 'geral' ? '3px solid var(--amber)' : 'none'"
             [style.font-weight]="ind.highlight ? '600' : ''">
          <span>{{ ind.label }}</span>
          <span [style.color]="ind.highlight === 'cc' ? 'var(--blue)' : ind.highlight === 'inv' ? 'var(--green)' : ind.highlight === 'geral' ? 'var(--amber)' : ''">
            {{ ind.value }}
          </span>
        </div>
      }
    </div>
  `,
})
export class KpiGridComponent {
  protected store: StoreService = inject(StoreService);
  protected t = this.store.totals;

  protected periodLabel = computed(() => {
    const { start, end } = this.store.period();
    if (start || end) {
      const de  = start ? start.toLocaleDateString('pt-BR') : 'início';
      const ate = end   ? end.toLocaleDateString('pt-BR')   : 'hoje';
      return `${de} – ${ate}`;
    }
    const dates = this.t().dates;
    if (!dates.length) return '—';
    return `${dates[0].toLocaleDateString('pt-BR')} – ${dates[dates.length - 1].toLocaleDateString('pt-BR')}`;
  });

  protected indicators = computed(() => {
    const v     = this.store.view();
    const t     = this.t();
    const nCr   = v.filter(r => r.valor > 0).length;
    const nDb   = v.filter(r => r.valor < 0).length;
    const days  = new Set(v.map(r => r.date.toLocaleDateString('pt-BR'))).size;
    const fBRL  = (n: number | null) => n === null ? '⚠ não calculado' : this.store.fBRL(n);
    return [
      { label: 'Saldo Conta Corrente',  value: fBRL(t.saldoCC),      highlight: 'cc' },
      { label: 'Saldo Investimentos',   value: fBRL(t.saldoInvest),  highlight: 'inv' },
      { label: 'Saldo Geral',           value: fBRL(t.saldoGeral),   highlight: 'geral' },
      { label: 'Qtd. créditos',         value: nCr,                  highlight: '' },
      { label: 'Qtd. débitos',          value: nDb,                  highlight: '' },
      { label: 'Ticket médio crédito',  value: fBRL(nCr ? t.totalIn / nCr : 0), highlight: '' },
      { label: 'Ticket médio débito',   value: fBRL(nDb ? Math.abs(t.totalOut) / nDb : 0), highlight: '' },
      { label: 'Maior crédito',         value: fBRL(Math.max(...v.filter(r => r.valor > 0).map(r => r.valor), 0)), highlight: '' },
      { label: 'Maior débito (abs)',     value: fBRL(Math.abs(Math.min(...v.map(r => r.valor), 0))), highlight: '' },
      { label: 'Dias com movimento',    value: days,                 highlight: '' },
      { label: 'Média ops/dia',         value: days ? (v.length / days).toFixed(1) : '—', highlight: '' },
    ];
  });
}
