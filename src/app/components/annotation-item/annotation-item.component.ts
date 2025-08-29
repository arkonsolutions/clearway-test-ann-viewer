import { Component, ElementRef, HostListener, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentStore } from '../../services/document.store';
import { AnnEntity } from '../../shared/models';

@Component({
  selector: 'app-annotation-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annotation-item.component.html',
  styleUrls: ['./annotation-item.component.scss']
})
export class AnnotationItemComponent {
  ann = input.required<AnnEntity>();
  zoom = input.required<number>();
  private store = inject(DocumentStore);
  private host = inject(ElementRef<HTMLElement>);

  editing = signal(false);

  styleBox = computed(() => ({
    left: `${this.ann().x * 100}%`,
    top: `${this.ann().y * 100}%`,
    width: `${this.ann().w * 100}%`,
    height: `${this.ann().h * 100}%`,
  }));

  startDragPos: { x: number; y: number } | null = null;

  onDragStart(ev: PointerEvent) {
    ev.preventDefault();

    // Только ЛКМ
    if (ev.pointerType === 'mouse' && ev.button !== 0) {
      return;
    }

    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this.startDragPos = { x: ev.clientX, y: ev.clientY };
  }

  @HostListener('pointermove', ['$event'])
  onDragMove(ev: PointerEvent) {
    if (!this.startDragPos) return;
    const layer = this.host.nativeElement.closest('.ann-layer') as HTMLElement;
    if (!layer) return;
    const rect = layer.getBoundingClientRect();
    const dx = (ev.clientX - this.startDragPos.x) / rect.width;
    const dy = (ev.clientY - this.startDragPos.y) / rect.height;

    const a = this.ann();
    this.store.updateAnnotation(a.id, {
      x: Math.max(0, Math.min(1 - a.w, a.x + dx)),
      y: Math.max(0, Math.min(1 - a.h, a.y + dy))
    });
    this.startDragPos = { x: ev.clientX, y: ev.clientY };
  }

  @HostListener('pointerup')
  onDragEnd() { this.startDragPos = null; }

  delete() { this.store.deleteAnnotation(this.ann().id); }

  enableEdit() { this.editing.set(true); }
  commitEdit(val: string) {
    this.store.updateAnnotation(this.ann().id, { text: val });
    this.editing.set(false);
  }
}
