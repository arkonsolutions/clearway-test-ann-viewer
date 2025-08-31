/** Генерация фейкового Id/ */
export function genId(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}


/** Значение (value) меньше минимального (min) - устанавливается в минимальное. Больше максимального (max) - устанавливается в максимальное */
export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));