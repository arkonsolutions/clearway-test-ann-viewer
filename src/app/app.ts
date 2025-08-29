import { Component, computed, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DocumentStore } from './services/document.store';

/** Все компоненты standalone: true по умолчанию в 20м ангуляре */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  private store = inject(DocumentStore);
  zoom = this.store.zoom;
  doc = this.store.doc;
  docTitle = computed(() => this.doc()?.title);

  zoomLabel = computed(() => `${Math.round(this.zoom() * 100)}%`);
  
  zoomIn() { this.store.zoomIn(); }
  zoomOut() { this.store.zoomOut(); }
  save() { this.store.save(); }
}
