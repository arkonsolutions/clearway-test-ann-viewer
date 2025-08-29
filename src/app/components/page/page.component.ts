import { Component, input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PageEntity } from '../../shared/models';
import { DocumentStore } from '../../services/document.store';
import { AnnotationLayerComponent } from '../annotation-layer/annotation-layer.component';

@Component({
  selector: 'app-page',
  standalone: true,
  imports: [CommonModule, AnnotationLayerComponent],
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent {
  page = input.required<PageEntity>();
  private store = inject(DocumentStore);
  zoom = this.store.zoom;
}
