import { Injectable } from '@angular/core';
import { BankInfo } from '../models/ofx.models';

const PALETTE = ['#185FA5','#1D9E75','#D85A30','#534AB7','#BA7517','#0F6E56','#A32D2D','#3B6D11'];

const BANK_DB: Record<string, BankInfo> = {
  '001': { n: 'Banco do Brasil',          s: 'BB',   c: '#F8DC00', t: '#1A1A18' },
  '033': { n: 'Santander',                s: 'SAN',  c: '#EC0000', t: '#fff' },
  '041': { n: 'Banrisul',                 s: 'BRS',  c: '#004990', t: '#fff' },
  '070': { n: 'BRB',                      s: 'BRB',  c: '#005B96', t: '#fff' },
  '077': { n: 'Inter',                    s: 'INT',  c: '#FF6B00', t: '#fff' },
  '084': { n: 'Uniprime',                 s: 'UNP',  c: '#004990', t: '#fff' },
  '085': { n: 'Cecred / Ailos',           s: 'AIL',  c: '#00529B', t: '#fff' },
  '097': { n: 'Credisis',                 s: 'CRD',  c: '#007A4D', t: '#fff' },
  '099': { n: 'Uniprime Norte',           s: 'UNO',  c: '#004990', t: '#fff' },
  '104': { n: 'Caixa Econômica Federal',  s: 'CEF',  c: '#005CA9', t: '#fff' },
  '136': { n: 'Unicred',                  s: 'UNI',  c: '#004B87', t: '#fff' },
  '184': { n: 'Itaú BBA',                 s: 'BBA',  c: '#EC7000', t: '#fff' },
  '197': { n: 'Stone',                    s: 'STN',  c: '#00A868', t: '#fff' },
  '208': { n: 'BTG Pactual',              s: 'BTG',  c: '#1D1D1B', t: '#C8A84B' },
  '212': { n: 'Banco Original',           s: 'ORI',  c: '#00C853', t: '#fff' },
  '218': { n: 'BS2',                      s: 'BS2',  c: '#1B3A6B', t: '#fff' },
  '237': { n: 'Bradesco',                 s: 'BRA',  c: '#CC092F', t: '#fff' },
  '260': { n: 'Nubank',                   s: 'NU',   c: '#820AD1', t: '#fff' },
  '290': { n: 'PagBank',                  s: 'PAG',  c: '#00C244', t: '#fff' },
  '318': { n: 'BMG',                      s: 'BMG',  c: '#ED1C24', t: '#fff' },
  '323': { n: 'Mercado Pago',             s: 'MP',   c: '#00B1EA', t: '#fff' },
  '336': { n: 'C6 Bank',                  s: 'C6',   c: '#242424', t: '#fff' },
  '341': { n: 'Itaú Unibanco',            s: 'ITÁ',  c: '#EC7000', t: '#fff' },
  '364': { n: 'Gerencianet / Efí',        s: 'EFI',  c: '#00A868', t: '#fff' },
  '371': { n: 'Warren',                   s: 'WAR',  c: '#1A1A2E', t: '#E0C97F' },
  '376': { n: 'JP Morgan',                s: 'JPM',  c: '#1A1A18', t: '#C8A84B' },
  '380': { n: 'PicPay',                   s: 'PIC',  c: '#21C25E', t: '#fff' },
  '389': { n: 'Banco Mercantil',          s: 'MER',  c: '#004A97', t: '#fff' },
  '403': { n: 'Cora',                     s: 'COR',  c: '#FF4081', t: '#fff' },
  '413': { n: 'BV Financeira',            s: 'BV',   c: '#004990', t: '#fff' },
  '422': { n: 'Banco Safra',              s: 'SAF',  c: '#004A97', t: '#fff' },
  '461': { n: 'Asaas',                    s: 'ASS',  c: '#003B5C', t: '#fff' },
  '505': { n: 'Credit Suisse',            s: 'CS',   c: '#00407A', t: '#fff' },
  '623': { n: 'Pan',                      s: 'PAN',  c: '#E30613', t: '#fff' },
  '633': { n: 'Rendimento',               s: 'REN',  c: '#006838', t: '#fff' },
  '655': { n: 'Neon',                     s: 'NEO',  c: '#00D3C8', t: '#1A1A18' },
  '707': { n: 'Daycoval',                 s: 'DAY',  c: '#004B87', t: '#fff' },
  '745': { n: 'Citibank',                 s: 'CITI', c: '#003B70', t: '#fff' },
  '748': { n: 'Sicredi',                  s: 'SIC',  c: '#009A44', t: '#fff' },
  '751': { n: 'Scotiabank',               s: 'SCO',  c: '#EC1C24', t: '#fff' },
  '755': { n: 'Bank of America',          s: 'BOA',  c: '#E31837', t: '#fff' },
  '756': { n: 'Sicoob / Bancoob',         s: 'SCB',  c: '#006B3F', t: '#fff' },
};

@Injectable({ providedIn: 'root' })
export class BankDbService {
  get(bankId: string): BankInfo | null {
    if (!bankId) return null;
    // Strip leading zeros then pad to 3 digits for lookup
    const stripped = String(bankId).replace(/^0+/, '') || '0';
    const key = stripped.padStart(3, '0');
    return BANK_DB[key] ?? BANK_DB[stripped] ?? null;
  }

  colorForIndex(index: number): string {
    return PALETTE[index % PALETTE.length];
  }

  buildLabel(bankId: string, acctId: string, fileName: string): string {
    const info = this.get(bankId);
    const bankName = info?.n ?? (bankId ? `Banco ${bankId}` : null);
    if (bankName && acctId) return `${bankName} — ${acctId}`;
    if (bankName) return bankName;
    if (acctId) return acctId;
    return fileName.replace(/\.ofx$/i, '');
  }
}
