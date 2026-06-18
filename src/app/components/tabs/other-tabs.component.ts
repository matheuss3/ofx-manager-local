import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { BrlPipe } from '../../pipes/brl.pipe';
import { Transaction, DayGroup, WeekGroup, DescGroup, AccountGroup } from '../../models/ofx.models';

const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

// ─── Daily ────────────────────────────────────────────────────
@Component({
  selector: 'app-daily',
  standalone: true,
  imports: [DatePipe, BrlPipe],
  template: `
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th (click)="sort(0)" [class]="sc(0)">Data<span class="si"></span></th>
          <th (click)="sort(1)" [class]="sc(1)">Dia<span class="si"></span></th>
          <th (click)="sort(2)" [class]="sc(2)" style="text-align:center">Qtd.<span class="si"></span></th>
          <th (click)="sort(3)" [class]="sc(3)" style="text-align:right">Entradas<span class="si"></span></th>
          <th (click)="sort(4)" [class]="sc(4)" style="text-align:right">Saídas<span class="si"></span></th>
          <th (click)="sort(5)" [class]="sc(5)" style="text-align:right">Resultado<span class="si"></span></th>
        </tr></thead>
        <tbody>
          @for (d of sorted(); track d.date.toISOString()) {
            <tr>
              <td>{{ d.date | date:'dd/MM/yyyy' }}</td>
              <td style="color:var(--muted)">{{ days[d.date.getDay()] }}</td>
              <td style="text-align:center">{{ d.n }}</td>
              <td style="text-align:right;color:var(--green)">{{ d.cred | brl }}</td>
              <td style="text-align:right;color:var(--red)">{{ d.deb | brl }}</td>
              <td style="text-align:right" [class.vcr]="(d.cred+d.deb)>=0" [class.vdb]="(d.cred+d.deb)<0">{{ d.cred+d.deb | brl }}</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class DailyComponent {
  private store: StoreService = inject(StoreService);
  protected days = DAYS;
  private col = signal(0);
  private dir = signal<1|-1>(1);

  sort(c: number) {
    this.dir.set(this.col() === c ? (this.dir() === 1 ? -1 : 1) as 1|-1 : 1);
    this.col.set(c);
  }
  sc(c: number) { return this.col() === c ? (this.dir() === 1 ? 'sa' : 'sd') : ''; }

  protected sorted(): DayGroup[] {
    return [...this.store.dayGroups()].sort((a: DayGroup, b: DayGroup) => {
      const pairs: [any,any][] = [
        [a.date, b.date],
        [DAYS[a.date.getDay()], DAYS[b.date.getDay()]],
        [a.n, b.n],
        [a.cred, b.cred],
        [a.deb, b.deb],
        [a.cred+a.deb, b.cred+b.deb],
      ];
      const [va, vb] = pairs[this.col()] ?? [a.date, b.date];
      return (va < vb ? -1 : va > vb ? 1 : 0) * this.dir();
    });
  }
}

// ─── Weekly ───────────────────────────────────────────────────
@Component({
  selector: 'app-weekly',
  standalone: true,
  imports: [BrlPipe],
  template: `
    <div class="tbl-wrap">
      <table>
        <thead><tr>
          <th (click)="sort(0)" [class]="sc(0)">Semana<span class="si"></span></th>
          <th (click)="sort(1)" [class]="sc(1)" style="text-align:center">Qtd.<span class="si"></span></th>
          <th (click)="sort(2)" [class]="sc(2)" style="text-align:right">Entradas<span class="si"></span></th>
          <th (click)="sort(3)" [class]="sc(3)" style="text-align:right">Saídas<span class="si"></span></th>
          <th (click)="sort(4)" [class]="sc(4)" style="text-align:right">Resultado<span class="si"></span></th>
          <th style="width:110px">% dos débitos</th>
        </tr></thead>
        <tbody>
          @for (w of sorted(); track w.key) {
            <tr>
              <td style="font-weight:500">{{ w.key }}</td>
              <td style="text-align:center">{{ w.n }}</td>
              <td style="text-align:right;color:var(--green)">{{ w.cred | brl }}</td>
              <td style="text-align:right;color:var(--red)">{{ w.deb | brl }}</td>
              <td style="text-align:right" [class.vcr]="(w.cred+w.deb)>=0" [class.vdb]="(w.cred+w.deb)<0">{{ w.cred+w.deb | brl }}</td>
              <td>
                <div class="bar-w"><div class="bar-f r" [style.width.%]="pct(w.deb)"></div></div>
                <span style="font-size:11px;color:var(--muted)">{{ pct(w.deb).toFixed(1) }}%</span>
              </td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class WeeklyComponent {
  private store: StoreService = inject(StoreService);
  private col = signal(0);
  private dir = signal<1|-1>(1);

  sort(c: number) {
    this.dir.set(this.col() === c ? (this.dir() === 1 ? -1 : 1) as 1|-1 : 1);
    this.col.set(c);
  }
  sc(c: number) { return this.col() === c ? (this.dir() === 1 ? 'sa' : 'sd') : ''; }

  protected pct(deb: number): number {
    const total = this.store.view().reduce((a: number, r: Transaction) => r.valor < 0 ? a + r.valor : a, 0);
    return total ? Math.min(Math.abs(deb / total) * 100, 100) : 0;
  }

  protected sorted(): WeekGroup[] {
    return [...this.store.weekGroups()].sort((a: WeekGroup, b: WeekGroup) => {
      const pairs: [any,any][] = [
        [a.key, b.key], [a.n, b.n], [a.cred, b.cred], [a.deb, b.deb], [a.cred+a.deb, b.cred+b.deb],
      ];
      const [va, vb] = pairs[this.col()] ?? [a.key, b.key];
      return (va < vb ? -1 : va > vb ? 1 : 0) * this.dir();
    });
  }
}

// ─── By Description ───────────────────────────────────────────
@Component({
  selector: 'app-by-description',
  standalone: true,
  imports: [DatePipe, BrlPipe],
  template: `
    <div class="filter-bar">
      <input type="text" [value]="q()" (input)="q.set($any($event.target).value)" placeholder="Buscar descrição…">
      <select [value]="tipo()" (change)="tipo.set($any($event.target).value)">
        <option value="">Todos</option><option value="cr">Crédito</option><option value="db">Débito</option>
      </select>
      <span class="f-count">{{ filtered().length }} grupos</span>
    </div>
    <div class="tbl-wrap"><table class="grp-tbl">
      <thead><tr>
        <th (click)="sort(0)" [class]="sc(0)">Descrição<span class="si"></span></th>
        <th (click)="sort(1)" [class]="sc(1)" style="text-align:center">Qtd.<span class="si"></span></th>
        <th (click)="sort(2)" [class]="sc(2)" style="text-align:right">Total<span class="si"></span></th>
        <th (click)="sort(3)" [class]="sc(3)" style="text-align:right">Entradas<span class="si"></span></th>
        <th (click)="sort(4)" [class]="sc(4)" style="text-align:right">Saídas<span class="si"></span></th>
        <th style="width:90px">Part.</th>
        <th style="text-align:center;width:50px">Det.</th>
      </tr></thead>
      <tbody>
        @for (g of filtered(); track g.label; let gi = $index) {
          <tr>
            <td style="font-weight:500;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" [title]="g.label">{{ g.label }}</td>
            <td style="text-align:center">{{ g.n }}</td>
            <td style="text-align:right" [class.vcr]="g.total>=0" [class.vdb]="g.total<0">{{ g.total | brl }}</td>
            <td style="text-align:right;color:var(--green)">{{ g.cred ? (g.cred | brl) : '—' }}</td>
            <td style="text-align:right;color:var(--red)">{{ g.deb ? (g.deb | brl) : '—' }}</td>
            <td>
              <div class="bar-w"><div class="bar-f" [class.r]="g.total<0" [style.width.%]="pct(g)"></div></div>
              <span style="font-size:11px;color:var(--muted)">{{ pct(g).toFixed(1) }}%</span>
            </td>
            <td style="text-align:center">
              <button class="exp-btn" (click)="toggle(gi)"><span class="msi">{{ expanded()===gi ? 'expand_more' : 'chevron_right' }}</span></button>
            </td>
          </tr>
          @if (expanded() === gi) {
            <tr><td colspan="7" style="padding:0;background:var(--surface2)">
              <table style="width:100%;font-size:12px;border-collapse:collapse">
                <tbody>
                  @for (r of g.rows.slice(0,150); track r.id) {
                    <tr>
                      <td style="padding:5px 9px 5px 24px">{{ r.date | date:'dd/MM/yyyy' }}</td>
                      <td><span class="dot" [style.background]="r.source?.color ?? '#BA7517'"></span>{{ r.source?.label ?? 'Manual' }}</td>
                      <td [class.vcr]="r.valor>=0" [class.vdb]="r.valor<0">{{ r.valor | brl }}</td>
                      <td style="color:var(--muted)">{{ r.id }}</td>
                    </tr>
                  }
                  @if (g.rows.length > 150) {
                    <tr><td colspan="4" style="text-align:center;color:var(--muted);font-style:italic;padding:6px">… mais {{ g.rows.length - 150 }}</td></tr>
                  }
                </tbody>
              </table>
            </td></tr>
          }
        }
      </tbody>
    </table></div>
  `,
})
export class ByDescriptionComponent {
  private store: StoreService = inject(StoreService);
  protected q        = signal('');
  protected tipo     = signal('');
  protected expanded = signal<number|null>(null);
  private   col      = signal(2);
  private   dir      = signal<1|-1>(-1);

  sort(c: number) {
    this.dir.set(this.col() === c ? (this.dir() === 1 ? -1 : 1) as 1|-1 : -1);
    this.col.set(c);
  }
  sc(c: number)    { return this.col() === c ? (this.dir() === 1 ? 'sa' : 'sd') : ''; }
  toggle(i: number){ this.expanded.set(this.expanded() === i ? null : i); }

  protected pct(g: DescGroup): number {
    const v    = this.store.view();
    const tIn  = v.reduce((a: number, r: Transaction) => r.valor > 0 ? a + r.valor : a, 0);
    const tOut = v.reduce((a: number, r: Transaction) => r.valor < 0 ? a + r.valor : a, 0);
    return Math.min(g.total >= 0 ? (tIn ? Math.abs(g.cred / tIn) * 100 : 0) : (tOut ? Math.abs(g.deb / tOut) * 100 : 0), 100);
  }

  protected filtered(): DescGroup[] {
    const q = this.q().toLowerCase(), t = this.tipo();
    let data = this.store.descGroups().filter((g: DescGroup) => {
      if (q && !g.label.toLowerCase().includes(q)) return false;
      if (t === 'cr' && g.cred === 0) return false;
      if (t === 'db' && g.deb  === 0) return false;
      return true;
    });
    return data.sort((a: DescGroup, b: DescGroup) => {
      const pairs: [any,any][] = [
        [a.label, b.label], [a.n, b.n], [a.total, b.total], [a.cred, b.cred], [a.deb, b.deb],
      ];
      const [va, vb] = pairs[this.col()] ?? [a.total, b.total];
      return (va < vb ? -1 : va > vb ? 1 : 0) * this.dir();
    });
  }
}

// ─── By Account ───────────────────────────────────────────────
@Component({
  selector: 'app-by-account',
  standalone: true,
  imports: [DatePipe, BrlPipe],
  template: `
    <div class="tbl-wrap"><table class="grp-tbl">
      <thead><tr>
        <th (click)="sort(0)" [class]="sc(0)">Conta<span class="si"></span></th>
        <th (click)="sort(1)" [class]="sc(1)" style="text-align:center">Qtd.<span class="si"></span></th>
        <th (click)="sort(2)" [class]="sc(2)" style="text-align:right">Entradas<span class="si"></span></th>
        <th (click)="sort(3)" [class]="sc(3)" style="text-align:right">Saídas<span class="si"></span></th>
        <th (click)="sort(4)" [class]="sc(4)" style="text-align:right">Resultado<span class="si"></span></th>
        <th style="width:90px">Part. déb.</th>
        <th style="text-align:center;width:50px">Det.</th>
      </tr></thead>
      <tbody>
        @for (g of sorted(); track g.id; let gi = $index) {
          <tr>
            <td style="font-weight:500"><span class="dot" [style.background]="g.color"></span>{{ g.label }}</td>
            <td style="text-align:center">{{ g.n }}</td>
            <td style="text-align:right;color:var(--green)">{{ g.cred | brl }}</td>
            <td style="text-align:right;color:var(--red)">{{ g.deb | brl }}</td>
            <td style="text-align:right" [class.vcr]="(g.cred+g.deb)>=0" [class.vdb]="(g.cred+g.deb)<0">{{ g.cred+g.deb | brl }}</td>
            <td>
              <div class="bar-w"><div class="bar-f r" [style.width.%]="pct(g.deb)"></div></div>
              <span style="font-size:11px;color:var(--muted)">{{ pct(g.deb).toFixed(1) }}%</span>
            </td>
            <td style="text-align:center">
              <button class="exp-btn" (click)="toggle(gi)"><span class="msi">{{ expanded()===gi ? 'expand_more' : 'chevron_right' }}</span></button>
            </td>
          </tr>
          @if (expanded() === gi) {
            <tr><td colspan="7" style="padding:0;background:var(--surface2)">
              <table style="width:100%;font-size:12px;border-collapse:collapse">
                <tbody>
                  @for (r of g.rows.slice(0,100); track r.id) {
                    <tr>
                      <td style="padding:5px 9px 5px 24px">{{ r.date | date:'dd/MM/yyyy' }}</td>
                      <td><span class="tag" [class]="r.isManual?'mn':r.valor>0?'cr':'db'">{{ r.isManual?'Manual':r.valor>0?'Crédito':'Débito' }}</span></td>
                      <td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ r.descricao }}</td>
                      <td [class.vcr]="r.valor>=0" [class.vdb]="r.valor<0">{{ r.valor | brl }}</td>
                    </tr>
                  }
                  @if (g.rows.length > 100) {
                    <tr><td colspan="4" style="text-align:center;color:var(--muted);font-style:italic;padding:6px">… mais {{ g.rows.length - 100 }}</td></tr>
                  }
                </tbody>
              </table>
            </td></tr>
          }
        }
      </tbody>
    </table></div>
  `,
})
export class ByAccountComponent {
  private store: StoreService = inject(StoreService);
  protected expanded = signal<number|null>(null);
  private   col      = signal(2);
  private   dir      = signal<1|-1>(-1);

  sort(c: number) {
    this.dir.set(this.col() === c ? (this.dir() === 1 ? -1 : 1) as 1|-1 : -1);
    this.col.set(c);
  }
  sc(c: number)    { return this.col() === c ? (this.dir() === 1 ? 'sa' : 'sd') : ''; }
  toggle(i: number){ this.expanded.set(this.expanded() === i ? null : i); }

  protected pct(deb: number): number {
    const total = this.store.view().reduce((a: number, r: Transaction) => r.valor < 0 ? a + r.valor : a, 0);
    return total ? Math.min(Math.abs(deb / total) * 100, 100) : 0;
  }

  protected sorted(): AccountGroup[] {
    return [...this.store.accountGroups()].sort((a: AccountGroup, b: AccountGroup) => {
      const pairs: [any,any][] = [
        [a.label, b.label], [a.n, b.n], [a.cred, b.cred], [a.deb, b.deb], [a.cred+a.deb, b.cred+b.deb],
      ];
      const [va, vb] = pairs[this.col()] ?? [a.cred, b.cred];
      return (va < vb ? -1 : va > vb ? 1 : 0) * this.dir();
    });
  }
}
