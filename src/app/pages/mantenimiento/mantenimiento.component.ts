import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { PropertyService } from '../../services/property.service';
import { Property } from '../../models/property';
import { PdfService } from '../../pdf.service';
import { ContactService } from '../../services/contact.service'; // Import ContactService
import { Contact } from '../../models/contact'; // Import Contact interface

// Tipo local para extender Property con el índice del carrusel
type DisplayProperty = Property & { _currentImageIndex?: number };

@Component({
  selector: 'app-mantenimiento',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet],
  templateUrl: './mantenimiento.component.html',
  styleUrls: ['./mantenimiento.component.css']
})
export class MantenimientoComponent implements OnInit {
  properties: DisplayProperty[] = [];
  filteredProperties: DisplayProperty[] = [];
  codigo: string = '';
  
  // Opciones para los selectores de filtro
  tiposPropiedad: string[] = [
    'CASA', 'DEPARTAMENTO', 'SUIT', 'PENTHOUSE', 'CASA RENTERA', 'CASAS EN CONDOMINIO', 'DEPARTAMENTOS PARA INVERSIONES',
    'TERRENO', 'HACIENDA', 'QUINTA VACACIONAL',
    'LOCAL COMERCIAL', 'OFICINA', 'NAVE INDUSTRIAL', 'BODEGA'
  ];
  estadosPropiedad: string[] = ['Disponible', 'En Venta', 'En Renta', 'Vendido', 'Rentado', 'Reservado'];
  ciudades: string[] = [];

  idPropiedadAEliminar: string | null = null;
  mostrarConfirmacion: boolean = false;

  // Filtros
  filtroTipo: string = '';
  filtroEstado: string = '';
  filtroCiudad: string = '';

  // Map to store contact codes and their full names and phone
  contactMap: Map<string, { nombreCompleto: string; telefono: string }> = new Map();

  constructor(
    private propertyService: PropertyService,
    private pdfService: PdfService,
    private router: Router,
    private contactService: ContactService // Inject ContactService
  ) {}

  ngOnInit(): void {
    // Fetch properties and contacts, then build the contact map
    this.propertyService.getPropiedades().subscribe(properties => {
      this.properties = properties.map(p => {
        // Sincronización silenciosa de LinkMapa si falta en Firebase
        if (p.id && p.LinkMapa === undefined) {
          console.log(`Parchando LinkMapa para: ${p.IPD}`);
          this.propertyService.actualizarPropiedad(p.id, { LinkMapa: '' });
        }
        
        return {
          ...p,
          LinkMapa: p.LinkMapa || '',
          imagenes: p.imagenes ?? [], // Ensure images array exists
          _currentImageIndex: 0 // Initialize image index for carousel
        };
      }).sort((a, b) => this.compararCodigosIPD(a.IPD, b.IPD));
      
      // Cargar ciudades únicas
      this.ciudades = Array.from(new Set(this.properties.map(p => p.CIUDAD?.toUpperCase().trim()))).filter(c => !!c).sort();
      
      this.filterProperties(); // Initial filter
    });

    // Fetch contacts and build the contact map
    this.contactService.getContacts().subscribe(contacts => {
      contacts.forEach(contact => {
        // Assuming 'codigo' is the unique identifier for contacts
        // and 'nombres' and 'apellidos' are available to form the full name.
        // If 'codigo' is not directly available or is different, adjust accordingly.
        if (contact.codigo) {
          const nombreCompleto = `${contact.nombres || ''} ${contact.apellidos || ''}`.trim();
          this.contactMap.set(contact.codigo, { 
            nombreCompleto,
            telefono: contact.telefono || 'N/A'
          });
        }
      });
      // After contacts are loaded and map is built, re-filter properties to ensure names are displayed
      this.filterProperties(); 
    });
  }
  
  /**
   * Muestra la imagen anterior de una propiedad.
   * @param property La propiedad que se está modificando.
   * @param event El evento de clic para detener su propagación.
   */
  previousImage(property: DisplayProperty, event: MouseEvent) {
    event.stopPropagation(); // Evita que se active el clic de la tarjeta
    if (!property.imagenes || property.imagenes.length === 0) return;

    if (property._currentImageIndex === undefined) {
      property._currentImageIndex = 0;
    }

    const newIndex = property._currentImageIndex - 1;
    property._currentImageIndex = newIndex < 0 ? property.imagenes.length - 1 : newIndex;
  }

  /**
   * Muestra la imagen siguiente de una propiedad.
   * @param property La propiedad que se está modificando.
   * @param event El evento de clic para detener su propagación.
   */
  nextImage(property: DisplayProperty, event: MouseEvent) {
    event.stopPropagation(); // Evita que se active el clic de la tarjeta
    if (!property.imagenes || property.imagenes.length === 0) return;

    if (property._currentImageIndex === undefined) {
      property._currentImageIndex = 0;
    }
    
    const newIndex = property._currentImageIndex + 1;
    property._currentImageIndex = newIndex >= property.imagenes.length ? 0 : newIndex;
  }

  modificarPropiedad(id: string) {
    this.router.navigate(['/propiedad', id]);
  }

  getImagenPrincipal(property: Property): string | null {
    return property.imagenes && property.imagenes.length > 0
      ? property.imagenes[0]
      : null;
  }

  exportarListado(tipo: string): void {
    const listadoBase = this.properties;
    
    const propiedadesFiltradas = listadoBase.filter(p => {
      const estado = (p.Estado || '').toUpperCase().trim();
      if (tipo === 'venta') {
        // En ventas, permitimos "VENTA", "EN VENTA", "DISPONIBLE" y evitamos expresamente rentas
        return estado.includes('VENTA') || (estado === 'DISPONIBLE' && !estado.includes('RENTA'));
      } else if (tipo === 'arriendo') {
        // En rentas, permitimos "RENTA", "ARRIENDO", "ALQUILER", "RENTADO"
        return estado.includes('RENTA') || estado.includes('ARRIENDO') || estado.includes('ALQUILER');
      }
      return false;
    });
  
    if (propiedadesFiltradas.length === 0) {
      alert(`❗ No se encontraron propiedades de tipo ${tipo.toUpperCase()}. Verifique los estados asignados.`);
      return;
    }
  
    this.pdfService.generarListadoPropiedades(propiedadesFiltradas, tipo);
  }

  exportarExcel(tipo: string): void {
    const listadoBase = this.properties;
    
    const propiedadesFiltradas = listadoBase.filter(p => {
      const estado = (p.Estado || '').toUpperCase().trim();
      if (tipo === 'venta') {
        return estado.includes('VENTA') || (estado === 'DISPONIBLE' && !estado.includes('RENTA'));
      } else if (tipo === 'arriendo') {
        return estado.includes('RENTA') || estado.includes('ARRIENDO') || estado.includes('ALQUILER');
      }
      return false;
    });
  
    if (propiedadesFiltradas.length === 0) {
      alert(`❗ No se encontraron propiedades de tipo ${tipo.toUpperCase()} para exportar.`);
      return;
    }
  
    this.pdfService.generarExcelListado(propiedadesFiltradas, tipo);
  }
  
  prepararEliminacion(id: string) {
    this.idPropiedadAEliminar = id;
    this.mostrarConfirmacion = true;
  }
  
  confirmarEliminacion() {
    if (!this.idPropiedadAEliminar) return;
  
    this.propertyService.eliminarPropiedad(this.idPropiedadAEliminar).then(() => {
      this.properties = this.properties.filter(p => p.id !== this.idPropiedadAEliminar);
      this.mostrarConfirmacion = false;
      this.idPropiedadAEliminar = null;
    });
  }
  
  cancelarEliminacion() {
    this.mostrarConfirmacion = false;
    this.idPropiedadAEliminar = null;
  }

  imprimirPDF(property: Property) {
    this.pdfService.generateProforma(property);
  }

  /**
   * Actualiza rápidamente el estado de una propiedad desde la tabla.
   * Esto activará el ocultamiento automático en el catálogo.
   */
  async cambiarEstadoRapido(property: Property, nuevoEstado: string) {
    if (!property.id) return;
    
    try {
      await this.propertyService.actualizarPropiedad(property.id, { Estado: nuevoEstado });
      property.Estado = nuevoEstado; // Actualización local de la vista
      this.filterProperties();
      console.log(`Estado de ${property.IPD} cambiado a ${nuevoEstado}`);
    } catch (error) {
      console.error('Error al actualizar estado:', error);
      alert('No se pudo actualizar el estado de la propiedad.');
    }
  }

  agregarNuevaPropiedad() {
    this.router.navigate(['/propiedad']); // Sin ID → formulario vacío
  }

  filterProperties(): void {
    const cod = this.codigo.toLowerCase().trim();
    const tipo = this.filtroTipo.toLowerCase();
    const estado = this.filtroEstado.toLowerCase();
    const ciudad = this.filtroCiudad.toUpperCase().trim();

    this.filteredProperties = this.properties.filter(p => {
      const matchCodigo = cod ? p.IPD.toLowerCase().includes(cod) : true;
      const matchTipo = tipo ? p.TipoPropiedad.toLowerCase() === tipo : true;
      const matchEstado = estado ? p.Estado.toLowerCase().includes(estado) : true;
      const matchCiudad = ciudad ? (p.CIUDAD?.toUpperCase().trim() === ciudad) : true;

      return matchCodigo && matchTipo && matchEstado && matchCiudad;
    }).sort((a, b) => this.compararCodigosIPD(a.IPD, b.IPD));
    
    console.log('✅ Propiedades filtradas:', this.filteredProperties.length);
  }

  /** Compara dos códigos IPD de forma numérica (ej: av2 < av10) */
  compararCodigosIPD(a: string, b: string): number {
    const numA = parseInt(a.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.replace(/\D/g, '')) || 0;
    return numA - numB;
  }

  limpiarFiltros(): void {
    this.codigo = '';
    this.filtroTipo = '';
    this.filtroEstado = '';
    this.filtroCiudad = '';
    this.filterProperties();
  }
}
