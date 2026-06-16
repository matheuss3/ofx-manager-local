import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from './services/store.service';
import { ExportService } from './services/export.service';
import { ExcelJsExportService } from './services/exceljs-export.service';
import { UploadComponent } from './components/upload/upload.component';
import { HistoryLogComponent } from './components/history-log/history-log.component';
import { KpiGridComponent } from './components/kpi-grid/kpi-grid.component';
import { AccountCardsComponent } from './components/account-cards/account-cards.component';
import { TransactionsComponent } from './components/tabs/transactions/transactions.component';
import { BalanceComponent } from './components/tabs/balance/balance.component';
import {
  DailyComponent, WeeklyComponent,
  ByDescriptionComponent, ByAccountComponent,
} from './components/tabs/other-tabs.component';

type TabId = 'tx' | 'desc' | 'conta' | 'saldo' | 'dia' | 'sem';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    UploadComponent, HistoryLogComponent,
    KpiGridComponent, AccountCardsComponent,
    TransactionsComponent, BalanceComponent,
    DailyComponent, WeeklyComponent, ByDescriptionComponent, ByAccountComponent,
  ],
  templateUrl: './app.component.html',
})
export class AppComponent {
  protected store  = inject(StoreService);
  protected exporter = inject(ExportService);
  protected exceljsExporter = inject(ExcelJsExportService);

  protected theme  = signal<'light'|'dark'>(this.savedTheme());
  protected activeTab = signal<TabId>('tx');

  protected hasData = computed(() => this.store.view().length > 0);

  protected tabs: { id: TabId; label: string }[] = [
    { id: 'tx',    label: 'Transações' },
    { id: 'desc',  label: 'Por descrição' },
    { id: 'conta', label: 'Por conta' },
    { id: 'saldo', label: 'Saldo por conta' },
    { id: 'dia',   label: 'Resumo diário' },
    { id: 'sem',   label: 'Resumo semanal' },
  ];

  toggleTheme() {
    const next = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('ofx-theme', next); } catch {}
  }

  private savedTheme(): 'light' | 'dark' {
    try {
      const saved = localStorage.getItem('ofx-theme') as any;
      if (saved) return saved;
      return window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    } catch { return 'light'; }
  }
}
