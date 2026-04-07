import { Component, OnInit } from '@angular/core';
import { SeguimientoService } from '../../services/seguimiento.service';
import { Seguimiento } from '../../models/seguimiento';
import { Property } from '../../models/property';
import { PropertyService } from '../../services/property.service';
import { Cliente } from '../../models/cliente';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { PdfService } from '../../pdf.service';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-seguimiento',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterOutlet],
  templateUrl: './seguimiento.component.html',
  styleUrls: ['./seguimiento.component.css']
})
export class SeguimientoComponent implements OnInit {

  /** Listas maestras para el funcionamiento del tablero */
  seguimientos: Seguimiento[] = [];
  clientes: Cliente[] = [];
  codigosIPD: string[] = [];

  /** Estado de la interfaz y seleccion de tickets */
  seguimientoSeleccionado: Seguimiento | null = null;
  historialCliente: Seguimiento[] = []; 
  esNuevoSeguimiento: boolean = false;
  tipoFiltro: 'venta' | 'renta' = 'venta';
  estadoFiltroMovil: 'nuevo' | 'proceso' | 'finalizado' = 'nuevo';
  
  /** IDs de tickets que el usuario ha decidido ocultar visualmente */
  idsOcultos: Set<string> = new Set();

  constructor(
    private seguimientoService: SeguimientoService,
    private pdfService: PdfService,
    private propertyService: PropertyService
  ) {
    this.cargarOcultos();
  }

  ngOnInit() {
    this.cargarDatos();
  }

  private cargarOcultos() {
    const data = localStorage.getItem('tickets_ocultos_fenix');
    if (data) {
      this.idsOcultos = new Set(JSON.parse(data));
    }
  }

  private guardarOcultos() {
    localStorage.setItem('tickets_ocultos_fenix', JSON.stringify(Array.from(this.idsOcultos)));
  }

  limpiarTicketsFinalizados() {
    const finalizados = this.getSeguimientosPorColumna('finalizado');
    finalizados.forEach(s => {
      if (s.id) this.idsOcultos.add(s.id);
    });
    this.guardarOcultos();
  }

  restaurarTicketsOcultos() {
    this.idsOcultos.clear();
    this.guardarOcultos();
  }

  /** Centraliza la carga de datos iniciales desde Firebase */
  cargarDatos(): void {
    this.seguimientoService.obtenerClientes().subscribe(c => this.clientes = c);
    this.propertyService.obtenerTodosLosCodigosIPD().then(codigos => this.codigosIPD = codigos);
    this.seguimientoService.obtenerSeguimientos().subscribe(s => {
      // Ordenar por fecha descendente para mostrar actividad reciente
      this.seguimientos = s.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
    });
  }

  /** Filtra los seguimientos segun el tab activo (Venta/Renta) */
  get seguimientosFiltrados(): Seguimiento[] {
    return this.seguimientos.filter(s => s.tipo === this.tipoFiltro);
  }

  /** Prepara el formulario para la apertura de un nuevo ticket */
  abrirModalParaNuevo() {
    this.esNuevoSeguimiento = true;
    this.historialCliente = [];
    this.seguimientoSeleccionado = {
      clienteId: '',
      propiedadCodigoIPD: '',
      tipo: this.tipoFiltro,
      estado: 'contactado',
      fecha: new Date().toISOString().split('T')[0],
      observaciones: ''
    };
  }

  /** Carga un ticket existente y recupera la bitacora historica del cliente */
  abrirModalParaEditar(seguimiento: Seguimiento) {
    this.esNuevoSeguimiento = false;
    this.seguimientoSeleccionado = { ...seguimiento };
    this.historialCliente = this.seguimientos.filter(s => s.clienteId === seguimiento.clienteId);
  }

  cerrarModal() {
    this.seguimientoSeleccionado = null;
    this.historialCliente = [];
  }

  /** Persiste los cambios del ticket en la base de datos distribuida */
  guardarSeguimiento() {
    if (!this.seguimientoSeleccionado) return;

    const { clienteId, propiedadCodigoIPD } = this.seguimientoSeleccionado;
    if (!clienteId || !propiedadCodigoIPD) {
      alert('Error: Cliente e Inmueble son obligatorios.');
      return;
    }

    if (this.esNuevoSeguimiento) {
      this.seguimientoService.crearSeguimiento(this.seguimientoSeleccionado)
        .then(() => {
          this.cerrarModal();
        })
        .catch(err => console.error('Fallo al crear ticket:', err));
    } else {
      this.seguimientoService.actualizarSeguimiento(this.seguimientoSeleccionado.id!, this.seguimientoSeleccionado)
        .then(() => {
          this.cerrarModal();
        })
        .catch(err => console.error('Fallo al actualizar ticket:', err));
    }
  }
  
  eliminarSeguimiento(id?: string) {
    if (!id) return;
    if (confirm('¿Desea anular permanentemente este ticket?')) {
      this.seguimientoService.eliminarSeguimiento(id)
        .catch(err => console.error('Fallo al eliminar:', err));
    }
  }
  
  obtenerNombreCliente(clienteId: string): string {
    const cliente = this.clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nombre : 'Desconocido';
  }

  generarPDF(tipo: 'venta' | 'renta') {
    const datos = this.seguimientos.filter(s => s.tipo === tipo);
    if (datos.length === 0) {
        alert('No hay datos para exportar en esta categoria.');
        return;
    }
    this.pdfService.generarListadoSeguimientos(datos, tipo, this.clientes);
  }

  /** 
   * Clasifica los tickets en columnas para la vista Kanban.
   * Logica de mapeo:
   * - nuevo: contactado
   * - proceso: visita agendada o negociacion
   * - finalizado: cerrado
   */
  getSeguimientosPorColumna(columna: 'nuevo' | 'proceso' | 'finalizado'): Seguimiento[] {
    const filtrados = this.seguimientosFiltrados.filter(s => !this.idsOcultos.has(s.id!));
    
    switch(columna) {
      case 'nuevo':
        return filtrados.filter(s => s.estado === 'contactado');
      case 'proceso':
        return filtrados.filter(s => s.estado === 'visita agendada' || s.estado === 'en negociación');
      case 'finalizado':
        return filtrados.filter(s => s.estado === 'cerrado');
      default:
        return [];
    }
  }

  /** 
   * Permite el movimiento rapido de tickets entre columnas actualizando
   * solo el atributo de estado en Firebase.
   */
  async cambiarEstadoTicket(ticket: Seguimiento, nuevoEstado: 'contactado' | 'visita agendada' | 'en negociación' | 'cerrado', event: Event) {
    event.stopPropagation(); // Previene la apertura del modal
    
    if (!ticket.id) return;

    try {
      await this.seguimientoService.actualizarSeguimiento(ticket.id, { estado: nuevoEstado });
      console.log(`Ticket ${ticket.id} migrado a ${nuevoEstado}`);
    } catch (error) {
      console.error('Error en la transicion de estado:', error);
    }
  }
}
