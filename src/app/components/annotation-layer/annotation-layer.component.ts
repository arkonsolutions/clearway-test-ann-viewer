import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnEntity, PageEntity } from '../../shared/models';
import { DocumentStore } from '../../services/document.store';
import { AnnotationItemComponent } from '../annotation-item/annotation-item.component';

interface DragState {
  active: boolean;
  startX: number; // (0..1)
  startY: number;
  curX: number;
  curY: number;
}

@Component({
  selector: 'app-annotation-layer',
  standalone: true,
  imports: [CommonModule, AnnotationItemComponent],
  templateUrl: './annotation-layer.component.html',
  styleUrls: ['./annotation-layer.component.scss']
})
export class AnnotationLayerComponent {
  Math = Math;

  page = input.required<PageEntity>();

  private store = inject(DocumentStore);
  anns = this.store.annotations;

  dragging = signal<DragState>({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });

  private addDragPointerId: number | null = null;
  private captureLayerEl: HTMLElement | null = null;

  // Начало создания аннотации по пустой области
  onPointerDown(e: PointerEvent) {

    // Отслеживаем только начало ведения курсора только с Левой КМ.
    if (e.pointerType === 'mouse' && e.button !== 0) {
      e.preventDefault();
      return;
    }

    
    if ((e.target as HTMLElement).closest('.annotation')) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    this.dragging.set({ active: true, startX: x, startY: y, curX: x, curY: y });
    
    this.captureLayerEl = e.currentTarget as HTMLElement;
    this.captureLayerEl.setPointerCapture(e.pointerId);
    this.addDragPointerId = e.pointerId;
  }

  onPointerMove(e: PointerEvent) {
    if (!this.dragging().active) return;
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = (e.clientX - box.left) / box.width;
    const y = (e.clientY - box.top) / box.height;
    this.dragging.update(s => ({ ...s, curX: x, curY: y }));
  }

  onPointerUp() {
    if (!this.dragging().active) return;
    const { startX, startY, curX, curY } = this.dragging();
    this.dragging.set({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });

    const x = Math.min(startX, curX);
    const y = Math.min(startY, curY);
    const w = Math.abs(curX - startX);
    const h = Math.abs(curY - startY);

    // Релизим поинтер
    if (this.captureLayerEl && !!this.addDragPointerId && this.captureLayerEl.hasPointerCapture(this.addDragPointerId)) {
      this.captureLayerEl.releasePointerCapture(this.addDragPointerId);
    }
    this.captureLayerEl = null;
    this.addDragPointerId = null;

    // защита от случайного клика
    if (w < 0.01 && h < 0.01) return;

    const newId = this.store.addAnnotation({
      pageNumber: this.page().number,
      x, y, w, h,
      text: ''
    } as AnnEntity);

    if (newId) {
      this.store.setTargetAnnotation(newId);
    }
  }

  annsOnPage = computed(() => this.anns().filter(a => a.pageNumber === this.page().number));
}
