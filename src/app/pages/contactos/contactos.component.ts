import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Contact } from '../../models/contact';
import { Property } from '../../models/property';
import { ContactService } from '../../services/contact.service';
import { PropertyService } from '../../services/property.service';
import { PdfService } from '../../pdf.service';

@Component({
  selector: 'app-contactos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contactos.component.html',
  styleUrls: ['./contactos.component.css']
})
export class ContactosComponent implements OnInit {
  /** Colecciones de datos maestros */
  contactos: Contact[] = [];
  propiedades: Property[] = [];
  
  /** Lista procesada para visualizacion en el directorio */
  contactosFiltrados: Contact[] = [];
  
  /** Gestion de seleccion y portafolio personal */
  contactoSeleccionado: Contact | null = null;
  propiedadesDelContacto: Property[] = [];
  
  /** Controladores de filtrado */
  searchTerm = ''; 
  filtroRol = '';
  
  /** Roles permitidos segun el modelo de negocio */
  rolesDisponibles: string[] = ['propietario', 'responsable', 'inmobiliaria', 'Terciario'];

  constructor(
    private contactService: ContactService,
    private propertyService: PropertyService,
    private pdfService: PdfService
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  /**
   * Carga sincrona de propiedades y contactos.
   * Se requiere la lista de propiedades primero para realizar el conteo
   * de inmuebles por cada contacto en tiempo de ejecucion.
   */
  cargarDatos(): void {
    this.propertyService.getAllProperties().subscribe(props => {
      this.propiedades = props;
      
      this.contactService.getContacts().subscribe(list => {
        this.contactos = list;
        this.aplicarFiltros();
        
        // Mantenimiento del estado de seleccion tras recarga de datos
        if (this.contactoSeleccionado && this.contactoSeleccionado.id) {
          const actualizado = list.find(c => c.id === this.contactoSeleccionado?.id);
          if (actualizado) this.seleccionarContacto(actualizado);
        }
      });
    });
  }

  /** Inicializa un objeto de contacto vacio con rol base */
  private inicializarNuevoContacto(): Contact {
    return { 
      nombres: '', 
      apellidos: '', 
      telefono: '', 
      rol: 'Terciario', 
      propiedadesAsociadas: [] 
    };
  }

  /** Activa la barra lateral en modo de creacion */
  abrirFormularioNuevo(): void {
    this.contactoSeleccionado = this.inicializarNuevoContacto();
    this.propiedadesDelContacto = [];
  }

  /** 
   * Filtra la coleccion de contactos basándose en busqueda textual 
   * (nombre, apellido, telefono, codigo) y rol.
   */
  aplicarFiltros(): void {
    let temp = [...this.contactos];

    if (this.filtroRol) {
      temp = temp.filter(c => c.rol === this.filtroRol);
    }

    if (this.searchTerm.trim()) {
      const s = this.searchTerm.toLowerCase();
      temp = temp.filter(c =>
        (c.nombres || '').toLowerCase().includes(s) ||
        (c.apellidos || '').toLowerCase().includes(s) ||
        (c.telefono || '').includes(s) ||
        (c.codigo && c.codigo.toLowerCase().includes(s))
      );
    }

    // Ordenamiento alfabetico por defecto para mejorar la navegacion
    this.contactosFiltrados = temp.sort((a, b) => (a.nombres || '').localeCompare(b.nombres || ''));
  }

  /** 
   * Carga el perfil del contacto y escanea el inventario global para 
   * construir su portafolio de inmuebles vinculados.
   */
  seleccionarContacto(contacto: Contact): void {
    this.contactoSeleccionado = { ...contacto }; // Clonacion para prevenir mutaciones indeseadas
    this.propiedadesDelContacto = this.propiedades.filter(p => 
      p.Propietario === contacto.codigo || p.Encargado === contacto.codigo
    );
  }

  /** Calcula dinamicamente el volumen de propiedades por contacto */
  contarPropiedades(codigo?: string): number {
    if (!codigo) return 0;
    return this.propiedades.filter(p => p.Propietario === codigo || p.Encargado === codigo).length;
  }

  /** Centraliza la persistencia para registros nuevos y actualizaciones */
  async guardarCambiosContacto(): Promise<void> {
    if (!this.contactoSeleccionado) return;
    
    if (!this.contactoSeleccionado.nombres || !this.contactoSeleccionado.rol) {
      alert('Datos obligatorios incompletos');
      return;
    }

    try {
      if (this.contactoSeleccionado.id) {
        const { id, ...datosParaActualizar } = this.contactoSeleccionado;
        await this.contactService.updateContact(id!, datosParaActualizar);
        alert('Perfil actualizado correctamente');
      } else {
        await this.contactService.createContact(this.contactoSeleccionado);
        alert('Contacto registrado en la base de datos');
        this.contactoSeleccionado = null; 
      }
      this.cargarDatos();
    } catch (error) {
      console.error('Error en persistencia de contacto:', error);
    }
  }

  /** Eliminacion logica/fisica de contactos en Firebase */
  async eliminarContacto(id?: string): Promise<void> {
    if (!id) return;
    if (confirm('Atencion: ¿Eliminar contacto de forma permanente?')) {
      await this.contactService.deleteContact(id);
      this.contactoSeleccionado = null;
      this.cargarDatos();
    }
  }

  cerrarSidebar(): void {
    this.contactoSeleccionado = null;
    this.propiedadesDelContacto = [];
  }

  descargarReportePDF() {
    this.pdfService.generarReportePropietarios(this.propiedades, this.contactos);
  }
}
