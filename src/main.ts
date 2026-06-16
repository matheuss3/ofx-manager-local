import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

// Apply saved theme before paint
try {
  const theme = localStorage.getItem('ofx-theme')
    ?? (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
} catch {}

bootstrapApplication(AppComponent, {
  providers: [provideAnimationsAsync()],
}).catch(err => console.error(err));
