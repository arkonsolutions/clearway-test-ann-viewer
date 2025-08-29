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
  zoom = input.required<number>();

  private store = inject(DocumentStore);
  anns = this.store.annotations;

  dragging = signal<DragState>({ active: false, startX: 0, startY: 0, curX: 0, curY: 0 });

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
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
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

    if (w < 0.01 && h < 0.01) return; // защита от случайного клика

    const newId = this.store.addAnnotation({
      pageNumber: this.page().number,
      x, y, w, h,
      text: ''
    } as AnnEntity);


    // При прекращении задания размера прямоульника(клавиша мыши отжата) - открыть на редактирование новую аннотацию. После выполнения текущей макротаски.
    queueMicrotask(() => {
      const el = document.querySelector(`[data-ann-id="${newId}"] .annotation__editor`) as HTMLTextAreaElement | null;
      el?.focus();
    });
  }

  annsOnPage = computed(() => this.anns().filter(a => a.pageNumber === this.page().number));
}
