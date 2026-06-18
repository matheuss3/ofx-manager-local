import { inject, Injectable } from '@angular/core';
import { StoreService } from './store.service';
import { AccountGroup, Transaction } from '../models/ofx.models';
import ExcelJS from 'exceljs';

// ── Palette ──────────────────────────────────────────────────
const MONEY   = '_(* #,##0.00_);_(* \\(#,##0.00\\);_(* "-"??_);_(@_)';
const FONT    = 'Calibri';

// Header row
const HDR_BG  = 'FF1E3A5F';  // dark navy
const HDR_FG  = 'FFFFFFFF';  // white

// Bank name row
const BANK_BG = 'FFE8EFF8';  // light blue-grey
const BANK_FG = 'FF1E3A5F';  // dark navy text

// Total row
const TOT_BG  = 'FFDCE6F1';  // slightly darker blue-grey
const DEB_FG  = 'FFCC0000';  // deep red for TOTAL DÉBITO
const CRE_FG  = 'FF0055A5';  // deep blue for TOTAL CRÉDITO
const VAL_DEB = 'FF8B0000';  // dark red for debit values
const VAL_CRE = 'FF0D5A1A';  // dark green for credit values

// Grand total
const GRAND_BG = 'FF1E3A5F'; // same as header
const GRAND_FG = 'FFFFFFFF';

// Borders
const M  = { style: 'medium' as const };
const T  = { style: 'thin'   as const };
const N  = { style: 'none'   as const };

type HA = 'left' | 'center' | 'right' | undefined;
type VA = 'top'  | 'middle' | 'bottom' | undefined;

function solid(argb: string): ExcelJS.Fill {
  return { type: 'pattern', pattern: 'solid', fgColor: { argb } };
}
function brd(t: any, b: any, l: any, r: any): Partial<ExcelJS.Borders> {
  return { top: t, bottom: b, left: l, right: r };
}
function c(
  cell: ExcelJS.Cell, value: any,
  bold: boolean, size: number,
  fg: string | undefined,
  bg: string | undefined,
  ha: HA, va: VA,
  t: any, b: any, l: any, r: any,
) {
  cell.value  = value;
  cell.font   = { bold, size, name: FONT, ...(fg ? { color: { argb: fg } } : {}) };
  cell.numFmt = MONEY;
  cell.border = brd(t, b, l, r);
  if (bg) cell.fill = solid(bg);
  if (ha || va) cell.alignment = { horizontal: ha, vertical: va };
}

@Injectable({ providedIn: 'root' })
export class ExcelJsExportService {
  private store: StoreService = inject(StoreService);

  async exportControleBancario(): Promise<void> {
    const wb = new ExcelJS.Workbook();
    wb.creator = 'OFX App';
    wb.created = new Date();

    const groups = this.store.accountGroups().filter(g => g.id !== '__manual');
    if (!groups.length) return;

    const ws = wb.addWorksheet('Controle Bancário', {
      pageSetup: { paperSize: 9, orientation: 'landscape' },
    });

    // Column widths
    [22, 16, 15, 12, 13, 15, 13, 13, 13, 13]
      .forEach((w, i) => ws.getColumn(i + 1).width = w);

    let R = 1;
    const totalARows: number[] = [];

    // ── RESUMO CONSOLIDADO ────────────────────────────────────
    const t        = this.store.totals();
    const period   = this.store.period();
    const allGroups = this.store.accountGroups().filter(g => g.id !== '__manual');
    const view     = this.store.view();
    const nCr      = view.filter((r: Transaction) => r.valor > 0).length;
    const nDb      = view.filter((r: Transaction) => r.valor < 0).length;
    const ticketCr = nCr ? t.totalIn / nCr : 0;
    const ticketDb = nDb ? Math.abs(t.totalOut) / nDb : 0;
    const maiorCr  = Math.max(...view.filter((r: Transaction) => r.valor > 0).map((r: Transaction) => r.valor), 0);
    const maiorDb  = Math.abs(Math.min(...view.map((r: Transaction) => r.valor), 0));
    const days     = new Set(view.map((r: Transaction) => r.date.toLocaleDateString('pt-BR'))).size;
    const periodoLabel = period.start || period.end
      ? `${period.start ? period.start.toLocaleDateString('pt-BR') : 'início'} – ${period.end ? period.end.toLocaleDateString('pt-BR') : 'hoje'}`
      : (t.dates.length ? `${t.dates[0].toLocaleDateString('pt-BR')} – ${t.dates[t.dates.length-1].toLocaleDateString('pt-BR')}` : '—');

    // Title row
    ws.getRow(R).height = 22;
    ws.mergeCells(`A${R}:J${R}`);
    c(ws.getCell(`A${R}`), 'EXTRATO CONSOLIDADO — CONTROLE BANCÁRIO',
      true, 13, GRAND_FG, GRAND_BG, 'center', 'middle', M,M,M,M);
    for (const col of ['B','C','D','E','F','G','H','I','J']) {
      ws.getCell(`${col}${R}`).fill   = solid(GRAND_BG);
      ws.getCell(`${col}${R}`).border = brd(M,M,N, col === 'J' ? M : N);
    }
    R++;

    // Period + generated date
    ws.getRow(R).height = 14;
    ws.mergeCells(`A${R}:E${R}`);
    ws.getCell(`A${R}`).value = `Período: ${periodoLabel}`;
    ws.getCell(`A${R}`).font  = { name: FONT, size: 9, italic: true, color: { argb: 'FF555555' } };
    ws.getCell(`A${R}`).border = brd(N,N,M,N);
    ws.mergeCells(`F${R}:J${R}`);
    ws.getCell(`F${R}`).value = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    ws.getCell(`F${R}`).font  = { name: FONT, size: 9, italic: true, color: { argb: 'FF555555' } };
    ws.getCell(`F${R}`).alignment = { horizontal: 'right' };
    ws.getCell(`F${R}`).border = brd(N,N,N,M);
    R++;
    R++; // blank

    // KPI section label
    ws.getRow(R).height = 14;
    ws.mergeCells(`A${R}:J${R}`);
    ws.getCell(`A${R}`).value = 'RESUMO CONSOLIDADO';
    ws.getCell(`A${R}`).font  = { name: FONT, size: 9, bold: true, color: { argb: 'FF888888' } };
    ws.getCell(`A${R}`).border = brd(N,T,M,M);
    R++;

    // ── SALDO SECTION (3 big cards: CC / Invest / Geral) ────────
    const saldoCards = [
      { label: 'Saldo Conta Corrente', value: t.saldoCC    ?? 'N/D', color: '1E3A5F' as const },
      { label: 'Saldo Investimentos',  value: t.saldoInvest ?? 'N/D', color: '0D5A1A' as const },
      { label: 'Saldo Geral',          value: t.saldoGeral  ?? 'N/D', color: 'BA7517' as const },
    ];
    const saldoCols = [['A','B','C'], ['D','E','F'], ['G','H','J']] as const;

    // Saldo label row
    ws.getRow(R).height = 12;
    for (let i = 0; i < 3; i++) {
      const [c1,,c3] = saldoCols[i];
      ws.mergeCells(`${c1}${R}:${c3}${R}`);
      ws.getCell(`${c1}${R}`).value     = saldoCards[i].label;
      ws.getCell(`${c1}${R}`).font      = { name: FONT, size: 9, bold: true, color: { argb: `FF${saldoCards[i].color}` } };
      ws.getCell(`${c1}${R}`).fill      = solid('FFF5F7FA');
      ws.getCell(`${c1}${R}`).border    = brd(M,N, i===0?M:T, i===2?M:T);
      ws.getCell(`${c1}${R}`).alignment = { horizontal: 'center' };
    }
    R++;

    // Saldo value row
    ws.getRow(R).height = 22;
    for (let i = 0; i < 3; i++) {
      const [c1,,c3] = saldoCols[i];
      ws.mergeCells(`${c1}${R}:${c3}${R}`);
      const sc = ws.getCell(`${c1}${R}`);
      sc.value     = saldoCards[i].value;
      sc.font      = { name: FONT, size: 14, bold: true, color: { argb: `FF${saldoCards[i].color}` } };
      sc.numFmt    = typeof saldoCards[i].value === 'number' ? MONEY : '@';
      sc.fill      = solid('FFFFFFFF');
      sc.border    = brd(N,M, i===0?M:T, i===2?M:T);
      sc.alignment = { horizontal: 'center', vertical: 'middle' };
    }
    R++;
    R++; // gap

    // KPI grid — 2 rows of 5 KPIs each
    const kpis = [
      { label: 'Período',           value: periodoLabel,                          fmt: '@'    },
      { label: 'Transações',        value: t.count,                               fmt: '0'    },
      { label: 'Total Entradas',    value: t.totalIn,                             fmt: MONEY  },
      { label: 'Total Saídas',      value: Math.abs(t.totalOut),                  fmt: MONEY  },
      { label: 'Resultado Líquido', value: t.net,                                 fmt: MONEY  },
      { label: 'Qtd. Créditos',     value: nCr,                                   fmt: '0'    },
      { label: 'Qtd. Débitos',      value: nDb,                                   fmt: '0'    },
      { label: 'Ticket Médio Créd.',value: ticketCr,                              fmt: MONEY  },
      { label: 'Ticket Médio Déb.', value: ticketDb,                              fmt: MONEY  },
      { label: 'Maior Crédito',     value: maiorCr,                               fmt: MONEY  },
      { label: 'Maior Débito (abs)',value: maiorDb,                               fmt: MONEY  },
      { label: 'Dias c/ Movimento', value: days,                                  fmt: '0'    },
      { label: 'Média Ops/Dia',     value: days ? +(t.count / days).toFixed(1) : 0, fmt: '0.0' },
    ];

    // Render KPIs in pairs: label row then value row, 5 cols wide each pair
    // Layout: 2 KPIs per merged pair of cols (A:B, C:D, E:F, G:H, I:J) per row
    const colPairs = [['A','B'],['C','D'],['E','F'],['G','H'],['I','J']];
    for (let row = 0; row < 3; row++) {
      // Label row
      ws.getRow(R).height = 11;
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        if (idx >= kpis.length) break;
        const [c1, c2] = colPairs[col];
        ws.mergeCells(`${c1}${R}:${c2}${R}`);
        ws.getCell(`${c1}${R}`).value  = kpis[idx].label;
        ws.getCell(`${c1}${R}`).font   = { name: FONT, size: 8, color: { argb: 'FF888888' } };
        ws.getCell(`${c1}${R}`).fill   = solid('FFF5F7FA');
        ws.getCell(`${c1}${R}`).border = brd(T,N,col===0?M:T,col===4?M:T);
        ws.getCell(`${c1}${R}`).alignment = { horizontal: 'center' };
      }
      R++;
      // Value row
      ws.getRow(R).height = 16;
      for (let col = 0; col < 5; col++) {
        const idx = row * 5 + col;
        if (idx >= kpis.length) break;
        const [c1, c2] = colPairs[col];
        ws.mergeCells(`${c1}${R}:${c2}${R}`);
        const cell = ws.getCell(`${c1}${R}`);
        cell.value  = kpis[idx].value;
        const isPos = typeof kpis[idx].value === 'number' && (kpis[idx].value as number) >= 0;
        const isNeg = kpis[idx].label === 'Resultado Líquido' && typeof kpis[idx].value === 'number' && (kpis[idx].value as number) < 0;
        cell.font   = {
          name: FONT, size: 11, bold: true,
          color: { argb: kpis[idx].label === 'Total Entradas' || kpis[idx].label === 'Maior Crédito' ? 'FF0D5A1A'
                       : kpis[idx].label === 'Total Saídas' || kpis[idx].label === 'Maior Débito (abs)' ? 'FF8B0000'
                       : isNeg ? 'FF8B0000'
                       : 'FF1E3A5F' }
        };
        cell.numFmt = kpis[idx].fmt;
        cell.fill   = solid('FFFFFFFF');
        cell.border = brd(N,T,col===0?M:T,col===4?M:T);
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
      R++;
    }

    R++; // blank before bank blocks
    R++; // blank

    // ── ROW 1: Header ─────────────────────────────────────────
    ws.getRow(R).height = 18;

    c(ws.getCell(`A${R}`), 'BANCO',            true, 11, HDR_FG, HDR_BG, 'center', 'middle', M,M,M,M);
    c(ws.getCell(`B${R}`), 'Saldo Anterior',   true, 10, HDR_FG, HDR_BG, 'center', 'middle', M,M,M,M);

    ws.mergeCells(`C${R}:D${R}`);
    c(ws.getCell(`C${R}`), 'Lançamentos Manuais', true, 9, HDR_FG, HDR_BG, 'center', 'middle', M,M,M,M);
    ws.getCell(`D${R}`).fill   = solid(HDR_BG);
    ws.getCell(`D${R}`).border = brd(M,M,N,M);

    ws.mergeCells(`E${R}:G${R}`);
    c(ws.getCell(`E${R}`), 'Débito',           true, 10, HDR_FG, HDR_BG, 'center', 'middle', M,M,M,M);
    ws.getCell(`F${R}`).fill   = solid(HDR_BG);
    ws.getCell(`F${R}`).border = brd(M,M,N,N);
    ws.getCell(`G${R}`).fill   = solid(HDR_BG);
    ws.getCell(`G${R}`).border = brd(M,M,N,M);

    ws.mergeCells(`H${R}:J${R}`);
    c(ws.getCell(`H${R}`), 'Crédito',          true, 10, HDR_FG, HDR_BG, 'center', 'middle', M,M,M,M);
    ws.getCell(`I${R}`).fill   = solid(HDR_BG);
    ws.getCell(`I${R}`).border = brd(M,M,N,N);
    ws.getCell(`J${R}`).fill   = solid(HDR_BG);
    ws.getCell(`J${R}`).border = brd(M,M,N,M);
    R++;

    // ── Bank blocks ───────────────────────────────────────────
    for (const g of groups) {
      const src      = this.store.sources().find(s => s.id === g.id);
      const label    = src?.label ?? g.label;
      const bankColor = (src?.color ?? g.color).replace('#', 'FF');
      // Split OFX vs manual rows
      // Rows with a tag are treated as manual too, even if they came from OFX
      const ofxRows  = g.rows.filter((r: Transaction) => !r.isManual && !r.tag);
      const manRows  = g.rows.filter((r: Transaction) =>  r.isManual ||  r.tag);
      const ofxDeb   = ofxRows.reduce((a: number, r: Transaction) => r.valor < 0 ? a + r.valor : a, 0);
      const ofxCre   = ofxRows.reduce((a: number, r: Transaction) => r.valor > 0 ? a + r.valor : a, 0);
      const manDeb   = manRows.reduce((a: number, r: Transaction) => r.valor < 0 ? a + r.valor : a, 0);
      const manCre   = manRows.reduce((a: number, r: Transaction) => r.valor > 0 ? a + r.valor : a, 0);

      // ── Data row ─────────────────────────────────────────
      const dataRow = R;
      ws.getRow(R).height = 15;

      // A: bank name with left accent color
      c(ws.getCell(`A${R}`), label, true, 10, BANK_FG, BANK_BG, undefined, 'middle', M,T,M,M);
      ws.getCell(`A${R}`).border = { ...brd(M,T,M,M), left: { style: 'thick', color: { argb: bankColor } } };

      // B: saldo anterior (empty on data row)
      c(ws.getCell(`B${R}`), null,    false, 10, undefined, BANK_BG, undefined, undefined, M,T,M,M);

      // C: manual debit, D: manual credit (separate columns)
      c(ws.getCell(`C${R}`), manDeb || null, false, 10,
        manDeb ? VAL_DEB : undefined, BANK_BG, 'right', undefined, M,T,M,T);
      c(ws.getCell(`D${R}`), manCre || null, false, 10,
        manCre ? VAL_CRE : undefined, BANK_BG, 'right', undefined, M,T,T,M);

      // E: OFX debit total (red)
      c(ws.getCell(`E${R}`), ofxDeb || null, false, 10, VAL_DEB, BANK_BG, 'right', undefined, M,T,M,T);
      c(ws.getCell(`F${R}`), null, false, 10, undefined, BANK_BG, undefined, undefined, M,T,T,T);
      c(ws.getCell(`G${R}`), null, false, 10, undefined, BANK_BG, undefined, undefined, M,T,T,M);
      c(ws.getCell(`H${R}`), null, false, 10, undefined, BANK_BG, undefined, undefined, M,T,M,T);
      c(ws.getCell(`I${R}`), null, false, 10, undefined, BANK_BG, undefined, undefined, M,T,T,T);

      // J: OFX credit total (green)
      c(ws.getCell(`J${R}`), ofxCre || null, false, 10, VAL_CRE, BANK_BG, 'right', undefined, M,T,T,M);
      R++;

      // ── Total row ─────────────────────────────────────────
      const totalRow = R;
      ws.getRow(R).height = 14;

      c(ws.getCell(`A${R}`),
        { formula: `B${R}+D${R}+G${R}+J${R}` },
        true, 10, BANK_FG, TOT_BG, undefined, undefined, N,M,M,M);
      ws.getCell(`A${R}`).border = { ...brd(N,M,M,M), left: { style: 'thick', color: { argb: bankColor } } };

      c(ws.getCell(`B${R}`), g.saldoInicial, false, 10, undefined, TOT_BG, 'right', undefined, T,M,M,M);
      c(ws.getCell(`C${R}`), null, false, 10, undefined, TOT_BG, undefined, undefined, N,M,N,T);
      c(ws.getCell(`D${R}`),
        { formula: `SUM(C${dataRow}:D${dataRow})` },
        false, 10, undefined, TOT_BG, 'right', undefined, N,M,T,M);

      ws.mergeCells(`E${R}:F${R}`);
      c(ws.getCell(`E${R}`), 'TOTAL DÉBITO', true, 9, DEB_FG, TOT_BG, 'center', 'middle', T,M,M,T);
      ws.getCell(`F${R}`).fill   = solid(TOT_BG);
      ws.getCell(`F${R}`).border = brd(T,M,N,T);

      c(ws.getCell(`G${R}`),
        { formula: `SUM(E${dataRow}:G${dataRow})` },
        true, 10, DEB_FG, TOT_BG, 'right', undefined, T,M,T,M);

      ws.mergeCells(`H${R}:I${R}`);
      c(ws.getCell(`H${R}`), 'TOTAL CRÉDITO', true, 9, CRE_FG, TOT_BG, 'center', 'middle', T,M,M,T);
      ws.getCell(`I${R}`).fill   = solid(TOT_BG);
      ws.getCell(`I${R}`).border = brd(T,M,N,T);

      c(ws.getCell(`J${R}`),
        { formula: `SUM(H${dataRow}:J${dataRow})` },
        true, 10, CRE_FG, TOT_BG, 'right', undefined, T,M,T,M);

      totalARows.push(totalRow);
      R++;
    }

    // ── Grand total ───────────────────────────────────────────
    R++;
    ws.getRow(R).height = 18;

    const grandFormula = totalARows.map(r => `A${r}`).join('+');
    c(ws.getCell(`A${R}`), 'TOTAL GERAL', true, 11, GRAND_FG, GRAND_BG, 'center', 'middle', M,M,M,M);
    c(ws.getCell(`B${R}`),
      { formula: grandFormula },
      true, 11, GRAND_FG, GRAND_BG, 'right', 'middle', M,M,M,M);
    for (const col of ['C','D','E','F','G','H','I','J']) {
      ws.getCell(`${col}${R}`).fill   = solid(GRAND_BG);
      ws.getCell(`${col}${R}`).border = brd(M,M,N, col === 'J' ? M : N);
    }

    const buf  = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `Controle_Bancario_${new Date().toISOString().slice(0, 10)}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
