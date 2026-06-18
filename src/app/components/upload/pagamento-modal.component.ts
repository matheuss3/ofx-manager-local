import { Component, inject, signal, computed, output } from '@angular/core';
import { StoreService } from '../../services/store.service';
import { BrlPipe } from '../../pipes/brl.pipe';
import { Transaction, Source, AccountType } from '../../models/ofx.models';

interface TransfLine {
  srcId: string;
  label: string;
  color: string;
  saldo: number;
  valor: number;
  accountType: AccountType;
}

@Component({
  selector: 'app-pagamento-modal',
  standalone: true,
  imports: [BrlPipe],
  template: `
    <div class="modal-overlay open"
         (click)="$event.target === $event.currentTarget && fechar.emit()">
      <div class="modal" style="max-width:580px;max-height:90vh;overflow-y:auto">
        <h3><span class="msi">currency_exchange</span> Pagamento multi-banco</h3>

        <div class="form-row">
          <div class="form-group">
            <label>Data *</label>
            <input type="date" [value]="data()"
                   (input)="data.set($any($event.target).value)">
          </div>
          <div class="form-group">
            <label>Valor total (R$) *</label>
            <input type="number" min="0.01" step="0.01" [value]="valorTotal()"
                   (input)="valorTotal.set(+$any($event.target).value)">
          </div>
        </div>

        <div class="form-row s1">
          <div class="form-group">
            <label>Descrição *</label>
            <input type="text" [value]="descricao()"
                   (input)="descricao.set($any($event.target).value)"
                   placeholder="Ex: Pagamento Fornecedor XYZ">
          </div>
        </div>

        <div class="form-row s1">
          <div class="form-group">
            <label>Banco pagador (efetua o pagamento final) *</label>
            <select [value]="bancoPagadorId()"
                    (change)="bancoPagadorId.set($any($event.target).value)">
              <option value="">— selecione —</option>
              @for (s of fontes(); track s.id) {
                <option [value]="s.id">
                  {{ s.accountType === 'investimento' ? '📈' : '🏦' }} {{ s.label }} — saldo: {{ saldoFonte(s.id) | brl }}
                </option>
              }
            </select>
          </div>
        </div>

        @if (bancoPagadorId() && faltante() > 0) {
          <div class="period-warning" style="margin-bottom:.75rem;border-radius:var(--r);display:flex;align-items:flex-start;gap:6px">
            <span><span class="msi">warning</span></span>
            <span>
              Saldo do banco pagador: <strong>{{ saldoFonte(bancoPagadorId()) | brl }}</strong>.
              Faltam <strong>{{ faltante() | brl }}</strong> — adicione transferências abaixo.
            </span>
          </div>

          <div class="form-group" style="margin-bottom:.75rem">
            <label>Transferências de outros bancos para o pagador</label>
            @for (linha of transferencias(); track linha.srcId) {
              <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding:.4rem .6rem;background:var(--surface2);border-radius:var(--r);border:1px solid var(--border)">
                <span class="dot" [style.background]="linha.color"></span>
                <span class="msi" style="font-size:14px;color:var(--muted)">{{ linha.accountType === 'investimento' ? 'trending_up' : 'account_balance' }}</span>
                <span style="flex:1;font-size:12px;font-weight:500">{{ linha.label }}</span>
                <span style="font-size:11px;color:var(--muted);white-space:nowrap">
                  saldo: {{ linha.saldo | brl }}
                </span>
                <input type="number" min="0" step="0.01" [value]="linha.valor"
                       (input)="setTransf(linha.srcId, +$any($event.target).value)"
                       style="width:120px;text-align:right;padding:.3rem .5rem;font-size:12px;border:1px solid var(--border);border-radius:var(--r);background:var(--input-bg);color:var(--text)">
              </div>
            }
          </div>
        }

        @if (bancoPagadorId() && valorTotal() > 0) {
          <div style="background:var(--surface2);border:1px solid var(--border);border-radius:var(--r);padding:.75rem .9rem;font-size:12px;margin-bottom:.75rem">
            <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.05em;margin-bottom:.5rem">
              Lançamentos que serão criados
            </div>
            @for (l of resumoLancamentos(); track $index) {
              <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 0;border-bottom:1px solid var(--border)">
                <span style="display:flex;align-items:center;gap:5px">
                  <span class="dot" [style.background]="l.color"></span>
                  <strong>{{ l.banco }}</strong>
                  <span style="color:var(--muted)">— {{ l.desc }}</span>
                </span>
                <span style="font-weight:600;white-space:nowrap"
                      [style.color]="l.valor < 0 ? 'var(--red)' : 'var(--green)'">
                  {{ l.valor | brl }}
                </span>
              </div>
            }
            <div style="display:flex;justify-content:space-between;margin-top:.5rem;font-weight:600;font-size:12px">
              <span>Cobertura</span>
              @if (saldoRestante() !== null) {
                <span [style.color]="saldoRestante()! >= 0 ? 'var(--green)' : 'var(--amber)'">
                  <span class="msi">{{ saldoRestante()! >= 0 ? 'check' : 'warning' }}</span>
                  {{ saldoRestante()! >= 0 ? 'suficiente' : 'faltam ' }}
                  @if (saldoRestante()! < 0) { {{ saldoRestante()! * -1 | brl }} }
                </span>
              }
            </div>
          </div>
        }

        @if (mostrarAvisoInsuficiente()) {
          <div style="background:var(--red-bg);border:1px solid var(--red);border-radius:var(--r);padding:.65rem .85rem;font-size:12px;color:var(--red);margin-bottom:.75rem">
            <strong><span class="msi">warning</span> Saldo insuficiente.</strong> Deseja confirmar mesmo assim?
            <div style="display:flex;gap:8px;margin-top:.5rem">
              <button class="btn-danger" style="font-size:12px;padding:.3rem .75rem"
                      (click)="confirmarMesmoAssim()">Confirmar mesmo assim</button>
              <button class="btn-sec" style="font-size:12px;padding:.3rem .75rem"
                      (click)="mostrarAvisoInsuficiente.set(false)">Cancelar</button>
            </div>
          </div>
        }

        <div class="modal-actions">
          <button class="btn-sec" (click)="fechar.emit()">Cancelar</button>
          <button class="btn-primary" [disabled]="!podeSalvar()" (click)="salvar()">
            <span class="msi">check</span> Criar lançamentos
          </button>
        </div>
      </div>
    </div>
  `,
})
export class PagamentoModalComponent {
  private store: StoreService = inject(StoreService);

  fechar = output<void>();
  salvo  = output<void>();

  data           = signal(new Date().toISOString().slice(0, 10));
  valorTotal     = signal(0);
  descricao      = signal('');
  bancoPagadorId = signal('');
  mostrarAvisoInsuficiente = signal(false);
  private transfMap = signal<Record<string, number>>({});

  protected fontes = computed(() =>
    this.store.sources().filter(s => !this.store.hiddenIds().has(s.id))
  );

  protected saldoFonte(id: string): number {
    const g = this.store.accountGroups().find(g => g.id === id);
    return g ? g.saldoInicial + g.cred + g.deb : 0;
  }

  protected transferencias = computed<TransfLine[]>(() =>
    this.fontes()
      .filter(s => s.id !== this.bancoPagadorId())
      .map(s => ({
        srcId: s.id, label: s.label, color: s.color,
        saldo: this.saldoFonte(s.id),
        valor: this.transfMap()[s.id] ?? 0,
        accountType: s.accountType,
      }))
  );

  protected faltante = computed(() => {
    if (!this.bancoPagadorId()) return 0;
    return Math.max(0, this.valorTotal() - this.saldoFonte(this.bancoPagadorId()));
  });

  protected totalTransf = computed(() =>
    this.transferencias().reduce((a, l) => a + l.valor, 0)
  );

  protected saldoRestante = computed(() => {
    if (!this.bancoPagadorId() || !this.valorTotal()) return null;
    return this.saldoFonte(this.bancoPagadorId()) + this.totalTransf() - this.valorTotal();
  });

  protected resumoLancamentos = computed(() => {
    const pagId = this.bancoPagadorId();
    const pag   = this.fontes().find(s => s.id === pagId);
    if (!pag || !this.valorTotal()) return [];
    const lines: { banco: string; color: string; desc: string; valor: number }[] = [];
    for (const l of this.transferencias().filter(l => l.valor > 0)) {
      lines.push({ banco: l.label,    color: l.color,    desc: `Transferência → ${pag.label}`,  valor: -l.valor });
      lines.push({ banco: pag.label,  color: pag.color,  desc: `Recebimento ← ${l.label}`,      valor:  l.valor });
    }
    lines.push({ banco: pag.label, color: pag.color, desc: this.descricao() || '(pagamento)', valor: -this.valorTotal() });
    return lines;
  });

  protected podeSalvar = computed(() =>
    !!this.data() && this.valorTotal() > 0 && !!this.descricao() && !!this.bancoPagadorId()
  );

  setTransf(srcId: string, valor: number) {
    this.transfMap.update(m => ({ ...m, [srcId]: Math.max(0, valor) }));
  }

  salvar() {
    const restante = this.saldoRestante();
    if (restante !== null && restante < 0) {
      this.mostrarAvisoInsuficiente.set(true);
      return;
    }
    this.criarLancamentos();
  }

  confirmarMesmoAssim() {
    this.mostrarAvisoInsuficiente.set(false);
    this.criarLancamentos();
  }

  private criarLancamentos() {
    const pagId = this.bancoPagadorId();
    const pag   = this.fontes().find(s => s.id === pagId)!;
    const [y, m, d] = this.data().split('-').map(Number);
    const date  = new Date(y, m - 1, d);
    const rows: Transaction[] = [];

    const makeRow = (srcId: string, src: Source | undefined, valor: number, desc: string): Transaction => ({
      id: `PAG-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      date, tipo: valor < 0 ? 'DEBIT' : 'CREDIT',
      valor, descricao: desc,
      isManual: true,
      source: src ?? null,
      linkedSourceId: srcId,
      acctLabel: src?.label ?? srcId,
    });

    // Transferências
    for (const l of this.transferencias().filter(l => l.valor > 0)) {
      const src = this.store.sources().find(s => s.id === l.srcId);
      rows.push(makeRow(l.srcId, src, -l.valor,
        `Transferência → ${pag.label} (${this.descricao()})`));
      rows.push(makeRow(pagId, pag,  l.valor,
        `Recebimento ← ${src?.label} (${this.descricao()})`));
    }

    // Pagamento final
    rows.push(makeRow(pagId, pag, -this.valorTotal(), this.descricao()));

    rows.forEach(r => this.store.addManualRow(r));

    const bancosEnvolvidos = this.transferencias()
      .filter(l => l.valor > 0).map(l => l.label);

    this.store.pushLog({
      type: 'saldo', icon: 'currency_exchange',
      title: `Pagamento: ${this.descricao()}`,
      meta: `${this.store.fBRL(this.valorTotal())} via ${pag.label}${bancosEnvolvidos.length ? ' + ' + bancosEnvolvidos.join(', ') : ''}`,
      undo: () => rows.forEach(r => this.store.deleteRow(r.id)),
    });

    // Reset
    this.valorTotal.set(0);
    this.descricao.set('');
    this.bancoPagadorId.set('');
    this.transfMap.set({});
    this.salvo.emit();
    this.fechar.emit();
  }
}
