export interface BankInfo {
  n: string;   // nome completo
  s: string;   // sigla (badge)
  c: string;   // cor de fundo
  t: string;   // cor do texto
}

export interface OFXMeta {
  bankId: string;
  acctId: string;
  acctType: string;
  dtStart: string;
  dtEnd: string;
  currency: string;
}

export interface Transaction {
  id: string;
  date: Date;
  tipo: string;
  valor: number;
  descricao: string;
  isManual: boolean;
  source: Source | null;
  linkedSourceId: string | null;
  acctLabel?: string;
}

export type AccountType = 'corrente' | 'investimento';

export interface Source {
  id: string;
  label: string;
  color: string;
  textColor: string;
  sigla: string;
  meta: OFXMeta;
  rows: Transaction[];
  saldoInicial: number;
  ofxHasBalance: boolean;
  fileName: string;
  accountType: AccountType;
}

export interface DayGroup {
  date: Date;
  cred: number;
  deb: number;
  n: number;
}

export interface WeekGroup {
  key: string;
  cred: number;
  deb: number;
  n: number;
}

export interface DescGroup {
  label: string;
  n: number;
  total: number;
  cred: number;
  deb: number;
  rows: Transaction[];
}

export interface AccountGroup {
  id: string;
  label: string;
  color: string;
  accountType: AccountType;
  n: number;
  cred: number;
  deb: number;
  rows: Transaction[];
  allRows: Transaction[];
  saldoInicial: number;
  saldoDesconhecido: boolean;
}

export type LogType = 'delete' | 'saldo';

export interface LogEntry {
  id: string;
  icon: string;
  type: LogType;
  title: string;
  meta: string;
  ts: Date;
  undone: boolean;
  undo: () => void;
}

export interface PeriodFilter {
  start: Date | null;
  end: Date | null;
}

export interface TxFilters {
  query: string;
  tipo: string;
  contaId: string;
  de: string;
  ate: string;
}
