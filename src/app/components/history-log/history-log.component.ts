import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreService } from '../../services/store.service';

@Component({
  selector: 'app-history-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (store.log().length) {
      <div class="log-panel">
        <button class="log-toggle" (click)="open.set(!open())">
          <span><span class="msi">assignment</span></span>
          <h3>Histórico de alterações</h3>
          <span class="log-count">{{ countLabel() }}</span>
          <span class="log-chevron" [class.open]="open()"><span class="msi">expand_more</span></span>
        </button>
        @if (open()) {
          <div class="log-body-wrap">
            <div class="log-list">
              @for (entry of store.log(); track entry.id) {
                <div class="log-entry" [class.undone]="entry.undone">
                  <span class="log-icon msi">{{ entry.icon }}</span>
                  <div class="log-info">
                    <div class="log-title">{{ entry.title }}</div>
                    <div class="log-meta">
                      {{ entry.meta }} · {{ entry.ts | date:'HH:mm' }}
                      @if (entry.undone) { <span class="text-green"> · <span class="msi">undo</span> desfeito</span> }
                    </div>
                  </div>
                  @if (!entry.undone) {
                    <button class="log-undo" (click)="store.undoLog(entry.id)"><span class="msi">undo</span> Desfazer</button>
                  }
                </div>
              }
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class HistoryLogComponent {
  protected store: StoreService = inject(StoreService);
  protected open  = signal(true);

  protected countLabel(): string {
    const active  = this.store.activeLog().length;
    const undone  = this.store.log().length - active;
    const label   = active === 0 ? 'nenhuma ação ativa'
                  : active === 1 ? '1 ação ativa'
                  : `${active} ações ativas`;
    const suffix  = undone ? ` · ${undone} desfeita${undone > 1 ? 's' : ''}` : '';
    return label + suffix;
  }
}
