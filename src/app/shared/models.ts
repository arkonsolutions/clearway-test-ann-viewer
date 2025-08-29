/** Аннотация */
export interface AnnEntity {
    id: string;
    /** Документ, к которому принадлежит */
    documentId: string;
    /** Лист, к которому принадлежит */
    pageNumber: number;
    /** X, (0..1) относительно картинки */
    x: number;
    /** Y, (0..1) относительно картинки */
    y: number;
    /** Width, (0..1) относительно картинки */
    w: number;
    /** Height, (0..1) относительно картинки */
    h: number;
    text: string;
}

/** Страница */
export interface PageEntity {
    number: number;
    imageUrl: string;
}

/** Документ */
export interface DocEntity {
    id: string;
    title: string;
    pages: PageEntity[];
    annotations: AnnEntity[];
}