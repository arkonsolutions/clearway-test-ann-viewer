import { Component, ElementRef, HostListener, Injector, ViewChild, afterNextRender, computed, effect, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnnEntity } from '../../shared/models';
import { DocumentStore } from '../../services/document.store';

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

  // перетаскивание
  startDragPos: { x: number; y: number } | null = null;

  onDragStart(ev: PointerEvent) {
    if (ev.pointerType === 'mouse' && ev.button !== 0) { ev.preventDefault(); return; }
    ev.preventDefault();
    (ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);
    this.startDragPos = { x: ev.clientX, y: ev.clientY };
  }

  @HostListener('pointermove', ['$event'])
  onDragMove(ev: PointerEvent) {
    if (!this.startDragPos) return;
    if (ev.pointerType === 'mouse' && (ev.buttons & 1) === 0) return;

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

  commitEdit(val: string) {
    this.store.updateAnnotation(this.ann().id, { text: val });
    this.editing.set(false);
  }
}
