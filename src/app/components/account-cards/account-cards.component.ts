import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';
import { BrlPipe } from '../../pipes/brl.pipe';

@Component({
  selector: 'app-account-cards',
  standalone: true,
  imports: [CommonModule, BrlPipe],
  template: `
    <div class="acct-grid">
      @for (g of store.accountGroups(); track g.id) {
        <div class="acct-card" [style.border-left-color]="g.color">
          <div class="acct-name">
            <span class="dot" [style.background]="g.color"></span>{{ g.label }}
          </div>
          <div class="acct-stats">
            {{ g.n }} transações no período<br>
            <span style="color:var(--green)">↑ {{ g.cred | brl }}</span>&nbsp;
            <span style="color:var(--red)">↓ {{ g.deb * -1 | brl }}</span>
          </div>
          @if (g.saldoDesconhecido) {
            <div class="balance-highlight" style="color:var(--amber)">
              <span class="msi">warning</span> saldo não calculado
              <span style="font-size:10px;font-weight:400">(informe saldo inicial)</span>
            </div>
          } @else {
            <div class="balance-highlight"
                 [style.color]="(g.saldoInicial + g.cred + g.deb) >= 0 ? 'var(--green)' : 'var(--red)'">
              Saldo: {{ g.saldoInicial + g.cred + g.deb | brl }}
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class AccountCardsComponent {
  protected store = inject(StoreService);
}
