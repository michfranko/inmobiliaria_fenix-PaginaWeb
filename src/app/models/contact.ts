export interface Contact {
    id?: string;
    nombres: string;
    apellidos: string;
    telefono: string;
    rol: 'propietario' | 'responsable'| 'inmobiliaria' | 'Terciario';
    codigo?: string; // Código único para referencia
    propiedadesAsociadas: string[]; // Array de IDs de propiedades
}