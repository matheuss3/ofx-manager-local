import { Injectable } from '@angular/core';
import { OFXMeta, Transaction } from '../models/ofx.models';

export interface ParsedOFX {
  rows: Omit<Transaction, 'source'>[];
  meta: OFXMeta;
  ofxBalance: number | null;
}

@Injectable({ providedIn: 'root' })
export class OfxParserService {

  /** Read a File, auto-detecting encoding from the OFX header, then parse. */
  async readFile(file: File): Promise<ParsedOFX> {
    const encoding = await this.detectEncoding(file);
    const text = await this.readAsText(file, encoding);
    return this.parse(text);
  }

  private detectEncoding(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const head = (e.target?.result as string) ?? '';
        const m = head.match(/ENCODING\s*:\s*(\S+)/i);
        const declared = (m?.[1] ?? '').toUpperCase();
        resolve(declared === 'UTF-8' ? 'utf-8' : 'windows-1252');
      };
      reader.onerror = () => resolve('windows-1252');
      reader.readAsText(file.slice(0, 512), 'latin-1');
    });
  }

  private readAsText(file: File, encoding: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
      reader.readAsText(file, encoding);
    });
  }

  parse(text: string): ParsedOFX {
    const blocks = text.match(/<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi) ?? [];
    const rows: Omit<Transaction, 'source'>[] = [];

    // Parses OFX TRNAMT values robustly. Standard OFX uses '.' as decimal
    // separator, but some Brazilian banks (confirmed: Santander) emit values
    // using ',' as decimal separator, and occasionally insert a stray '.'
    // as a malformed thousands separator (e.g. "8730.251,40" instead of
    // "8.730.251,40" or "8730251,40"). This parser finds the actual decimal
    // separator (the LAST comma or dot in the string) and strips any other
    // dots/commas before it, treating them as thousands separators.
    const parseAmount = (raw: string): number => {
      const s = raw.trim();
      const lastComma = s.lastIndexOf(',');
      const lastDot   = s.lastIndexOf('.');
      const decimalIdx = Math.max(lastComma, lastDot);
      if (decimalIdx === -1) return parseFloat(s) || 0;

      let intPart = s.slice(0, decimalIdx).replace(/[.,]/g, '');
      const decPart = s.slice(decimalIdx + 1).replace(/[^0-9]/g, '');
      const sign = intPart.startsWith('-') ? '-' : '';
      intPart = intPart.replace('-', '');
      const n = parseFloat(`${sign}${intPart}.${decPart}`);
      return isNaN(n) ? 0 : n;
    };

    for (const b of blocks) {
      const g = (tag: string) => {
        const m = b.match(new RegExp(`<${tag}>([^<\n\r]+)`));
        return m ? m[1].trim() : '';
      };
      const dtRaw = g('DTPOSTED');
      const amtRaw = g('TRNAMT');
      if (!dtRaw || !amtRaw) continue;

      const date = new Date(
        +dtRaw.slice(0, 4),
        +dtRaw.slice(4, 6) - 1,
        +dtRaw.slice(6, 8),
      );
      rows.push({
        id: g('FITID') || `ofx-${Math.random()}`,
        date,
        tipo: g('TRNTYPE'),
        valor: parseAmount(amtRaw),
        descricao: g('MEMO') || g('NAME') || '(sem descrição)',
        isManual: false,
        linkedSourceId: null,
      });
    }

    rows.sort((a, b) => +a.date - +b.date);

    const ex = (tag: string) => {
      const m = text.match(new RegExp(`<${tag}>([^\n\r<]+)`));
      return m ? m[1].trim() : '';
    };

    const ledBal = text.match(/<LEDGERBAL>[\s\S]*?<BALAMT>([\d.\-]+)/i);
    const ofxBalance = ledBal ? parseFloat(ledBal[1]) : null;

    return {
      rows,
      meta: {
        bankId: (ex('FID') || ex('BANKID')).replace(/^0+/, '').padStart(3, '0'),
        acctId: ex('ACCTID'),
        acctType: ex('ACCTTYPE'),
        dtStart: ex('DTSTART'),
        dtEnd: ex('DTEND'),
        currency: ex('CURDEF') || 'BRL',
      },
      ofxBalance,
    };
  }
}
