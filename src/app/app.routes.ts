import { Routes } from '@angular/router';
import { DocumentViewerComponent } from './components/document-viewer/document-viewer.component';

export const routes: Routes = [
    { path: '', pathMatch: 'full', redirectTo: 'viewer/1' },
    { path: 'viewer/:id', component: DocumentViewerComponent },
    { path: '**', redirectTo: '' }
];
