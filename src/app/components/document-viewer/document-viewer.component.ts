import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { DocumentStore } from '../../services/document.store';
import { distinctUntilChanged, filter, map } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DEFAULT_PAGE_HEIGHT, DEFAULT_PAGE_WIDTH } from '../../shared/constants';
import { PageComponent } from '../page/page.component';

@Component({
    selector: 'app-document-viewer',
    standalone: true,
    imports: [CommonModule, PageComponent],
    templateUrl: './document-viewer.component.html',
    styleUrls: ['./document-viewer.component.scss']
})
export class DocumentViewerComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private store = inject(DocumentStore);
    private destroyRef = inject(DestroyRef);

    readonly defaultPageW = DEFAULT_PAGE_WIDTH;
    readonly defaultPageH = DEFAULT_PAGE_HEIGHT;

    zoom = this.store.zoom;
    doc = this.store.doc;
    pages = this.store.pages;
    loading = this.store.loading;
    error = this.store.error;

    ngOnInit() {
        // При смена значения :id параметра рута, подгрудаем данные документа с новым id
         this.route.paramMap.pipe(
            map(p => p.get('id') as string),
            filter((id : string) => !!id),
            distinctUntilChanged(),
            takeUntilDestroyed(this.destroyRef)
        ).subscribe((id: string) => {
            this.store.load(id);
        });
    }
}