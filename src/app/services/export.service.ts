import { inject, Injectable } from '@angular/core';
import { StoreService } from './store.service';

import * as XLSX from 'xlsx';

// Excel serial date: days since 1900-01-01 (with Lotus 1-2-3 leap year bug)
function dateToSerial(d: Date): number {
  return Math.floor((d.getTime() - new Date(1899, 11, 30).getTime()) / 86400000);
}



const DAYS = ['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];

@Injectable({ providedIn: 'root' })
export class ExportService {
  private store: StoreService = inject(StoreService);

  // ── CSV (pt-BR, semicolon) ───────────────────────────────────
  exportCSV() {
    const rows  = this.store.view();
    const gc    = this.store.accountGroups();
    const day   = this.store.dayGroups();
    const desc  = this.store.descGroups();
    const t     = this.store.totals();

    const esc = (v: any) => {
      const s = String(v ?? '');
      return s.includes(';') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const fNum = (n: number) => n.toFixed(2).replace('.', ',');
    const fDate = (d: Date) => d.toLocaleDateString('pt-BR');
    const row = (arr: any[]) => arr.map(v => typeof v === 'number' ? fNum(v) : esc(v)).join(';') + '\r\n';

    let csv = '\uFEFF'; // BOM

    csv += row(['#','Data','Dia da Semana','Conta','Tipo','Descrição','Valor']);
    rows.forEach((r, i) => {
      const lbl  = r.source?.label ?? r.acctLabel ?? 'Manual';
      const tipo = r.isManual ? 'Manual' : r.valor > 0 ? 'Crédito' : 'Débito';
      csv += row([i+1, fDate(r.date), DAYS[r.date.getDay()], lbl, tipo, r.descricao, r.valor]);
    });

    csv += '\r\n' + row(['SALDO POR CONTA','','','','','','']);
    csv += row(['Conta','Saldo Inicial','Entradas','Saídas','Resultado','Saldo Atual','']);
    gc.forEach(g => csv += row([g.label, g.saldoInicial, g.cred, g.deb, g.cred+g.deb, g.saldoDesconhecido?'N/D':g.saldoInicial+g.cred+g.deb, '']));

    csv += '\r\n' + row(['RESUMO DIÁRIO','','','','','','']);
    csv += row(['Data','Dia','Qtd.','Entradas','Saídas','Resultado','']);
    [...day].sort((a,b) => +a.date - +b.date)
      .forEach(d => csv += row([fDate(d.date), DAYS[d.date.getDay()], d.n, d.cred, d.deb, d.cred+d.deb, '']));

    csv += '\r\n' + row(['POR DESCRIÇÃO','','','','','','']);
    csv += row(['Descrição','Qtd.','Total','Entradas','Saídas','% do Total','']);
    [...desc].sort((a,b) => Math.abs(b.total)-Math.abs(a.total))
      .forEach(g => csv += row([g.label, g.n, g.total, g.cred, g.deb,
        rows.length ? (g.n/rows.length*100).toFixed(2)+'%' : '', '']));

    this.download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }),
      `extrato_${new Date().toISOString().slice(0,10)}.csv`);
  }

  // ── XLSX ─────────────────────────────────────────────────────
  exportXLSX() {
    const rows = this.store.view();
    const gc   = this.store.accountGroups();
    const t    = this.store.totals();
    const wb   = XLSX.utils.book_new();
    const fDate= (d: Date) => d.toLocaleDateString('pt-BR');

    // Resumo
    const ws1 = XLSX.utils.aoa_to_sheet([
      ['EXTRATO CONSOLIDADO'],
      ['Gerado em:', new Date().toLocaleString('pt-BR')],
      [], ['INDICADOR', 'VALOR'],
      ['Total Entradas', t.totalIn], ['Total Saídas', t.totalOut], ['Resultado', t.net],
      ['Qtd. Transações', t.count],
      [], ['SALDO POR CONTA','','',''],
      ['Conta','Saldo Inicial','Resultado','Saldo Atual'],
      ...gc.map(g => [g.label, g.saldoInicial, g.cred+g.deb, g.saldoDesconhecido?'N/D':g.saldoInicial+g.cred+g.deb]),
    ]);
    ws1['!cols'] = [{wch:36},{wch:20}];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');

    // Transações
    const txH = ['#','Data','Dia','Conta','Tipo','Descrição','Valor'];
    const txD = rows.map((r,i) => [
      i+1, dateToSerial(r.date), DAYS[r.date.getDay()],
      r.source?.label ?? r.acctLabel ?? 'Manual',
      r.isManual ? 'Manual' : r.valor > 0 ? 'Crédito' : 'Débito',
      r.descricao, r.valor,
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([txH, ...txD]);
    ws2['!cols'] = [{wch:5},{wch:13},{wch:12},{wch:22},{wch:11},{wch:42},{wch:17}];
    for (let i = 1; i <= rows.length; i++) {
      const c = ws2[XLSX.utils.encode_cell({r:i,c:1})];
      if (c) { c.t = 'n'; c.z = 'DD/MM/YYYY'; }
    }
    XLSX.utils.book_append_sheet(wb, ws2, 'Transações');

    // Por Conta
    const gcH = ['Conta','Qtd.','Saldo Inicial','Entradas','Saídas','Resultado','Saldo Atual'];
    const ws3 = XLSX.utils.aoa_to_sheet([gcH, ...gc.map(g => [g.label, g.n, g.saldoInicial, g.cred, g.deb, g.cred+g.deb, g.saldoDesconhecido?'N/D':g.saldoInicial+g.cred+g.deb])]);
    ws3['!cols'] = [{wch:30},{wch:7},{wch:16},{wch:16},{wch:16},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Conta');

    // Por Descrição
    const desc = this.store.descGroups();
    const gdH = ['Descrição','Qtd.','Total','Entradas','Saídas'];
    const ws4 = XLSX.utils.aoa_to_sheet([gdH, ...[...desc].sort((a,b)=>Math.abs(b.total)-Math.abs(a.total)).map(g=>[g.label,g.n,g.total,g.cred,g.deb])]);
    ws4['!cols'] = [{wch:44},{wch:8},{wch:16},{wch:16},{wch:16}];
    XLSX.utils.book_append_sheet(wb, ws4, 'Por Descrição');

    // Diário
    const day = this.store.dayGroups();
    const dyH = ['Data','Dia','Qtd.','Entradas','Saídas','Resultado'];
    const ws5 = XLSX.utils.aoa_to_sheet([dyH, ...[...day].sort((a,b)=>+a.date-+b.date).map(d=>[dateToSerial(d.date),DAYS[d.date.getDay()],d.n,d.cred,d.deb,d.cred+d.deb])]);
    ws5['!cols'] = [{wch:13},{wch:12},{wch:7},{wch:16},{wch:16},{wch:16}];
    for (let i=1;i<=day.length;i++){const c=ws5[XLSX.utils.encode_cell({r:i,c:0})];if(c){c.t='n';c.z='DD/MM/YYYY'}}
    XLSX.utils.book_append_sheet(wb, ws5, 'Resumo Diário');

    XLSX.writeFile(wb, `extrato_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  private download(blob: Blob, name: string) {
    const url = URL.createObjectURL(blob);
    const a   = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
}
