import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../../services/store.service';
import { BrlPipe } from '../../../pipes/brl.pipe';

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

@Component({
  selector: 'app-balance',
  standalone: true,
  imports: [CommonModule, BrlPipe],
  template: `
    <p style="font-size:12px;color:var(--muted);margin-bottom:.85rem">
      Evolução do saldo de cada conta, considerando o saldo inicial informado.
    </p>
    <div class="tbl-wrap">
      <table class="grp-tbl">
        <thead>
          <tr>
            <th>Conta</th>
            <th style="text-align:right">Saldo inicial</th>
            <th style="text-align:right">Entradas</th>
            <th style="text-align:right">Saídas</th>
            <th style="text-align:right">Resultado</th>
            <th style="text-align:right">Saldo atual</th>
            <th style="text-align:center;width:60px">Dias</th>
          </tr>
        </thead>
        <tbody>
          @for (g of store.accountGroups(); track g.id; let gi = $index) {
            <tr>
              <td style="font-weight:500">
                <span class="dot" [style.background]="g.color"></span>{{ g.label }}
              </td>
              <td style="text-align:right;color:var(--muted)">
                @if (g.saldoDesconhecido) {
                  <span style="color:var(--amber)">⚠ não calculado</span>
                } @else {
                  {{ g.saldoInicial | brl }}
                  @if (store.period().start) {
                    <span style="font-size:10px;color:var(--muted)"> (início do período)</span>
                  }
                }
              </td>
              <td style="text-align:right;color:var(--green)">{{ g.cred | brl }}</td>
              <td style="text-align:right;color:var(--red)">{{ g.deb | brl }}</td>
              <td style="text-align:right" [class.vcr]="(g.cred+g.deb) >= 0" [class.vdb]="(g.cred+g.deb) < 0">
                {{ g.cred + g.deb | brl }}
              </td>
              @if (g.saldoDesconhecido) {
                <td style="text-align:right;color:var(--amber);font-weight:600">⚠</td>
              } @else {
                <td style="text-align:right;font-weight:600"
                    [class.text-green]="(g.saldoInicial + g.cred + g.deb) >= 0"
                    [class.text-red]="(g.saldoInicial + g.cred + g.deb) < 0">
                  {{ g.saldoInicial + g.cred + g.deb | brl }}
                </td>
              }
              <td style="text-align:center">
                <button class="exp-btn" (click)="toggle(gi)">{{ expanded() === gi ? '▼ fechar' : '▶' }}</button>
              </td>
            </tr>

            <!-- Day detail -->
            @if (expanded() === gi) {
              <tr>
                <td colspan="7" style="padding:0">
                  <table style="width:100%;font-size:12px;border-collapse:collapse">
                    <thead>
                      <tr>
                        <th style="padding:5px 9px 5px 24px;font-size:11px;background:var(--surface2);text-align:left">Data</th>
                        <th style="padding:5px 9px;font-size:11px;background:var(--surface2);text-align:left">Dia</th>
                        <th style="padding:5px 9px;font-size:11px;background:var(--surface2);text-align:right">Saldo inicial do dia</th>
                        <th style="padding:5px 9px;font-size:11px;background:var(--surface2);text-align:right">Movimento</th>
                        <th style="padding:5px 9px;font-size:11px;background:var(--surface2);text-align:right">Saldo final do dia</th>
                      </tr>
                    </thead>
                    <tbody>
                      <!-- saldo inicial row -->
                      @if (!g.saldoDesconhecido) {
                        <tr style="background:var(--surface2)">
                          <td colspan="2" style="padding:5px 9px 5px 24px;font-weight:500;color:var(--muted)">
                            Saldo inicial{{ store.period().start ? ' do período' : '' }}
                          </td>
                          <td colspan="2"></td>
                          <td style="text-align:right;font-weight:600;padding:5px 9px"
                              [class.text-green]="g.saldoInicial >= 0"
                              [class.text-red]="g.saldoInicial < 0">
                            {{ g.saldoInicial | brl }}
                          </td>
                        </tr>
                      }
                      @for (day of dayRows(g); track day.dateKey) {
                        <tr>
                          <td style="padding:5px 9px 5px 24px">{{ day.date | date:'dd/MM/yyyy' }}</td>
                          <td style="padding:5px 9px;color:var(--muted)">{{ days[day.date.getDay()] }}</td>
                          <td style="text-align:right;padding:5px 9px;color:var(--muted)">{{ day.open | brl }}</td>
                          <td style="text-align:right;padding:5px 9px" [class.vcr]="day.mov >= 0" [class.vdb]="day.mov < 0">{{ day.mov | brl }}</td>
                          <td style="text-align:right;padding:5px 9px;font-weight:500"
                              [class.text-green]="day.close >= 0" [class.text-red]="day.close < 0">
                            {{ day.close | brl }}
                          </td>
                        </tr>
                      }
                      @if (!g.rows.length) {
                        <tr><td colspan="5" style="text-align:center;color:var(--muted);font-style:italic;padding:8px">Nenhum movimento no período</td></tr>
                      }
                    </tbody>
                  </table>
                </td>
              </tr>
            }
          }
        </tbody>
      </table>
    </div>
  `,
})
export class BalanceComponent {
  protected store    = inject(StoreService);
  protected expanded = signal<number | null>(null);
  protected days     = DAYS;

  toggle(i: number) { this.expanded.set(this.expanded() === i ? null : i); }

  dayRows(g: any) {
    const byDay = new Map<string, { date: Date; mov: number }>();
    for (const r of g.rows) {
      const k = r.date.toLocaleDateString('pt-BR');
      if (!byDay.has(k)) byDay.set(k, { date: r.date, mov: 0 });
      byDay.get(k)!.mov += r.valor;
    }
    let bal = g.saldoInicial;
    return [...byDay.values()]
      .sort((a, b) => +a.date - +b.date)
      .map(d => {
        const open  = bal;
        bal += d.mov;
        return { date: d.date, dateKey: d.date.toISOString(), mov: d.mov, open, close: bal };
      });
  }
}
