import { Component, ElementRef, HostListener, Injector, ViewChild, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnEntity } from '../../shared/models';
import { DocumentStore } from '../../services/document.store';
import { MIN_ANNOTATION_SIZE } from '../../shared/constants';
import { clamp } from '../../shared/utils';

@Component({
  selector: 'app-annotation-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './annotation-item.component.html',
  styleUrls: ['./annotation-item.component.scss']
})
export class AnnotationItemComponent {
  @ViewChild('editor') editorRef?: ElementRef<HTMLTextAreaElement>;
  private injector = inject(Injector);

  ann = input.required<AnnEntity>();
  zoom = input.required<number>();
  private store = inject(DocumentStore);
  private host = inject(ElementRef<HTMLElement>);

  editing = signal(false);

  // ховер-флаги только для рамки и панели
  hoverBox = signal(false);
  hoverControls = signal(false);

  // показывать панель, если курсор над рамкой или над панелью
  showControls = computed(() => this.hoverBox() || this.hoverControls());

  styleBox = computed(() => ({
    left: `${this.ann().x * 100}%`,
    top: `${this.ann().y * 100}%`,
    width: `${this.ann().w * 100}%`,
    height: `${this.ann().h * 100}%`,
  }));

  private dragPointerId: number | null = null;
  private resizePointerId: number | null = null;
  /** Ссылка на перетаскиваемый в данный момент элемент */
  private captureEl: HTMLElement | null = null;
  /** Ссылка на элемент Annotation layer */
  private layerEl: HTMLElement | null = null;

  private dragStartPos: { x: number; y: number } | null = null;
  private resizeStartPos: { startX: number; startY: number; baseW: number; baseH: number } | null = null;

  constructor() {
    // Обработка установки аннотации (id), как редактируемой в данный момент. 
    // Если редакритуемой должна быть текущая - отображаем поле редакора текта
    effect(() => {
      const targetId = this.store.targetAnnotationId();
      if (targetId === this.ann().id) {
        this.enableEdit();
        this.store.clearTargetAnnotation();
      }
    });
  }

  // клик вне — скрыть
  @HostListener('document:pointerdown', ['$event'])
  onDocPointerDown(ev: PointerEvent) {
    if (!this.host.nativeElement.contains(ev.target as Node)) {
      this.hoverBox.set(false);
      this.hoverControls.set(false);
    }
  }

  
  onBoxEnter(){ this.hoverBox.set(true); }
  onBoxLeave(){ this.hoverBox.set(false); }
  onCtrlsEnter(){ this.hoverControls.set(true); }
  onCtrlsLeave(){ this.hoverControls.set(false); }

  onDragStart(ev: PointerEvent) {
    ev.preventDefault();
    if (ev.pointerType === 'mouse' && ev.button !== 0) { 
      return; 
    }
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    this.captureEl = el;
    this.dragPointerId = ev.pointerId;
    this.dragStartPos = { 
      x: ev.clientX, 
      y: ev.clientY 
    };
  }

  onResizeStart(ev: PointerEvent) {
    ev.preventDefault(); 
    if (ev.pointerType === 'mouse' && ev.button !== 0) { 
      return; 
    }
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    this.captureEl = el;
    this.resizePointerId = ev.pointerId;
    const a = this.ann();
    this.resizeStartPos = { 
      startX: ev.clientX, 
      startY: ev.clientY, 
      baseW: a.w, 
      baseH: a.h 
    };
  }

  @HostListener('pointermove', ['$event'])
  onPointerMove(ev: PointerEvent) {

    if (!this.layerEl) {
      this.layerEl = this.host.nativeElement.closest('.ann-layer') as HTMLElement;
    }
    if (!this.layerEl) return;
    const rect = this.layerEl.getBoundingClientRect();

    if (this.resizeStartPos) {

      // ev.buttons - битовая маска зажатых кнопок. 1 - левая КМ.
      // При ведении курсора отпущена ЛКМ - прекратить ресайз
      if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) return;

      const dx = (ev.clientX - this.resizeStartPos.startX) / rect.width;
      const dy = (ev.clientY - this.resizeStartPos.startY) / rect.height;

      const a = this.ann();
      const newW = clamp(
        this.resizeStartPos.baseW + dx,
        MIN_ANNOTATION_SIZE,
        1 - a.x
      );
      const newH = clamp(
        this.resizeStartPos.baseH + dy,
        MIN_ANNOTATION_SIZE,
        1 - a.y
      );

      this.store.updateAnnotation(a.id, { w: newW, h: newH });
      return;
    }

    if (this.dragStartPos) {
      // При ведении курсора отпущена ЛКМ - прекратить перетаскивание
      if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) return;

      const dx = (ev.clientX - this.dragStartPos.x) / rect.width;
      const dy = (ev.clientY - this.dragStartPos.y) / rect.height;

      const a = this.ann();
      this.store.updateAnnotation(a.id, {
        x: Math.max(0, Math.min(1 - a.w, a.x + dx)),
        y: Math.max(0, Math.min(1 - a.h, a.y + dy))
      });
      this.dragStartPos = { x: ev.clientX, y: ev.clientY };
    }

  }

  /** Снимаем захват, установленный setPointerCapture */
  private releasePointerCapture() {
    const id = this.resizePointerId ?? this.dragPointerId;
    if (this.captureEl && id != null && this.captureEl.hasPointerCapture(id)) {
      this.captureEl.releasePointerCapture(id);
    }
    this.captureEl = null;
    this.dragPointerId = null;
    this.resizePointerId = null;
  }

  @HostListener('pointerup')
  onPointerUp() { 
    this.releasePointerCapture();
    this.dragStartPos = null;
    this.resizeStartPos = null;
  }

  @HostListener('pointercancel')
  onPointerCancel() {
    this.releasePointerCapture();
    this.dragStartPos = null;
    this.resizeStartPos = null;
  }

  @HostListener('lostpointercapture')
  onLostPointerCapture() {
    this.releasePointerCapture();
    this.dragStartPos = null;
    this.resizeStartPos = null;
  }

  delete() { this.store.deleteAnnotation(this.ann().id); }

  enableEdit() { 
    this.editing.set(true); 
    // Убеждаемся, DOM обновлён(рендер произошёл), и в результате textarea присутствует в DOM. после ставим фокус на textarea.
    afterNextRender(() => {
      const el = this.editorRef?.nativeElement;
      if (el != null) {
        el.textContent = this.ann().text;
        el.focus();

        // Ставим курсок в конец редактируемой строки
        const endOfString = el.value.length;
        el.setSelectionRange(endOfString, endOfString);
      }
    }, {injector: this.injector});
  }

  commitEdit() {
    if (!!this.editorRef) {
      this.store.updateAnnotation(this.ann().id, { text: this.editorRef.nativeElement.value });
    }
    this.editing.set(false);
  }
}
