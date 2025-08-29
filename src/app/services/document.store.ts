import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DocEntity, AnnEntity, PageEntity } from '../shared/models';
import { genId } from '../shared/utils';

/** Шаг кнопки zoom in/out */
const ZOOM_STEP = 0.1;
/** Минимальное значение zoom. 25% */
const ZOOM_MIN = 0.25;
/** Максимальное значение zoom. 400% */
const ZOOM_MAX = 4;

type MockupDocumentDTO = {
  name: string;
  pages: { number: number; imageUrl: string }[];
};

@Injectable({ providedIn: 'root' })
export class DocumentStore {
    private http = inject(HttpClient);

    // Состояние
    private _doc = signal<DocEntity | null>(null);
    private _zoom = signal(1); // коэффициент масштабирования
    private _loading = signal(false);
    private _error = signal<string | null>(null);

    readonly doc: Signal<DocEntity | null> = this._doc.asReadonly();
    readonly zoom = this._zoom.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();

    readonly pages = computed(() => this._doc()?.pages ?? []);
    readonly annotations = computed(() => this._doc()?.annotations ?? []);

    load(id: string) {
        this._loading.set(true);
        this._error.set(null);
        this.http.get<MockupDocumentDTO>(`${id}.json`).subscribe({
            next: (mockup) => {
                const entity: DocEntity = {
                    id,
                    title: mockup.name,
                    pages: mockup.pages.map(p => ({ number: p.number, imageUrl: p.imageUrl }) as PageEntity),
                    annotations: [] // TODO: Подгрузить annotations из IndexedDB
                };
                
                this._doc.set(entity);
                this._loading.set(false);
            },
            error: (err) => {
                this._error.set(String(err));
                this._loading.set(false);
            }
        });
    }

    setZoom(val: number) { 
        this._zoom.set(
            Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, val)) // Ограничение значения zoom'а. Вернёт минимально допустамое, если значение меньше минимального. Аналогично с максимальным. 
        ); 
    }
    zoomIn(step = ZOOM_STEP) { this.setZoom(this._zoom() + step); }
    zoomOut(step = ZOOM_STEP) { this.setZoom(this._zoom() - step); }
    resetZoom() { this.setZoom(1); }

    /**
     * Создание новой аннотации.
     * @param item Почти AnnEntity, за исключением того, что ID мы ненерируем на уровне BLL. Поэтому используем Omit чтобы typescript принял аргумент и понял что это за тип без id.
     * @returns 
     */
    addAnnotation(item: Omit<AnnEntity, 'id'>) {
        const doc = this._doc();
        if (!doc) return;
        const ann: AnnEntity = { ...item, id: genId() };
        this._doc.set({ ...doc, annotations: [...doc.annotations, ann] });
        return ann.id;
    }

    updateAnnotation(id: string, itemPatch: Partial<AnnEntity>) {
        const doc = this._doc();
        if (!doc) return;
        const newAnnSet = doc.annotations.map(a => a.id === id ? { ...a, ...itemPatch } : a); // В элемент результирующего массива попадут все поля и значения из itemPath, но поля и значения, которых в нем нет(не обновлялись) будут взяты из исходного a.
        this._doc.set({ ...doc, annotations: newAnnSet });
    }

    deleteAnnotation(id: string) {
        const doc = this._doc();
        if (!doc) return;
        const newAnnSet = doc.annotations.filter(a => a.id !== id);
        this._doc.set({ ...doc, annotations: newAnnSet });
    }

    save() {
        const doc = this._doc();
        console.log('Document state:', JSON.stringify(doc, null, 2));
    }
}