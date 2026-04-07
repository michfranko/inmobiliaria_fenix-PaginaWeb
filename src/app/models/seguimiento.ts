export interface Seguimiento {
    id?: string;
    clienteId: string;
    propiedadCodigoIPD: string;
    tipo: 'venta' | 'renta';
    estado: 'contactado' | 'visita agendada' | 'en negociación' | 'cerrado';
    fecha: string;
    observaciones?: string;
  }
  