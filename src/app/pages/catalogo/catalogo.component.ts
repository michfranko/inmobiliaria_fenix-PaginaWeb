import { Component,OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { Property } from '../../models/property';
import { DetallePropiedadComponent } from '../detalle-propiedad/detalle-propiedad.component';
import { PropertyCardComponent } from '../../components/property-card/property-card.component';

type DisplayProperty = Property & { _currentImageIndex?: number };

@Component({
  selector: 'app-catalogo',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule, DetallePropiedadComponent, PropertyCardComponent],
  templateUrl: './catalogo.component.html',
  styleUrl: './catalogo.component.css'
})
export class CatalogoComponent implements OnInit {
  properties: DisplayProperty[] = [];
  filteredProperties: DisplayProperty[] = [];
  selectedPropertyId: string | null = null;
  selectedProperty: Property | null = null;

  categoryGroups = [
    { name: 'Vivienda', icon: 'fas fa-home', types: ['CASA', 'DEPARTAMENTO', 'SUIT', 'PENTHOUSE', 'CASA RENTERA', 'CASAS EN CONDOMINIO', 'DEPARTAMENTOS PARA INVERSIONES'] },
    { name: 'Terrenos y Fincas', icon: 'fas fa-mountain', types: ['TERRENO', 'HACIENDA', 'QUINTA VACACIONAL'] },
    { name: 'Comercial e Industrial', icon: 'fas fa-building', types: ['LOCAL COMERCIAL', 'OFICINA', 'NAVE INDUSTRIAL'] },
    { name: 'Proyectos', icon: 'fas fa-city', types: ['PROYECTO'] }
  ];
  activeMainCategory: string | null = null;
  activeSubCategory: string | null = null;
  subCategories: string[] = [];
  showSidebar: boolean = true;

  city: string = '';
  estado: string = '';
  codigo: string = '';
  propertyType: string = '';
  searchTerm: string = ''; // Propiedad añadida para corregir error NG9
  
  // Filtros Avanzados
  showAdvanced: boolean = false;
  minPrice: number | null = null;
  maxPrice: number | null = null;
  minRooms: number | null = null;
  minBaths: number | null = null;
  minArea: number | null = null;
  
  cities: string[] = [];
  isMobile: boolean = false;
  
  // Paginación visual para performance
  itemsToShow: number = 6;

  constructor(private route: ActivatedRoute, private propertyService: PropertyService) {
    this.checkScreenSize();
  }

  loadMore() {
    this.itemsToShow += 6;
  }

  ngOnInit(): void {
    window.addEventListener('resize', () => this.checkScreenSize());
    this.propertyService.getPropiedades().subscribe((data) => {
      this.properties = data.map(p => ({
        ...p,
        TipoPropiedad: this.limpiarTextoTipo(p.TipoPropiedad || ''),
        CIUDAD: p.CIUDAD?.toUpperCase().trim() || '',
        _currentImageIndex: 0
      }));

      this.cities = Array.from(new Set(this.properties.map(p => p.CIUDAD))).filter(c => !!c);

      this.route.queryParams.subscribe(params => {
        const initialType = this.limpiarTextoTipo(params['propertyType'] || '');
        if (initialType) {
          this.findAndSetInitialCategory(initialType);
        } else {
          this.filterProperties();
        }
      });
    });
  }

  findAndSetInitialCategory(initialType: string) {
    for (const group of this.categoryGroups) {
      if (group.types.includes(initialType)) {
        this.activeMainCategory = group.name;
        this.subCategories = group.types;
        this.activeSubCategory = initialType;
        break;
      }
    }
    this.filterProperties();
  }

  selectMainCategory(groupName: string): void {
    if (this.activeMainCategory === groupName) {
      this.activeMainCategory = null;
      this.activeSubCategory = null;
      this.subCategories = [];
    } else {
      this.activeMainCategory = groupName;
      const group = this.categoryGroups.find(g => g.name === groupName);
      this.subCategories = group ? group.types : [];
      this.activeSubCategory = null;
    }
    
    this.showSidebar = groupName !== 'Proyectos';
    this.filterProperties();
  }

  selectSubCategory(typeName: string): void {
    this.activeSubCategory = (this.activeSubCategory === typeName) ? null : typeName;
    this.filterProperties();
  }

  filterProperties(): void {
    this.propertyType = this.activeSubCategory || '';

    const filtroEstado = this.estado.toLowerCase().trim();
    const filtroCiudad = this.city.toUpperCase().trim();
    const filtroCodigo = this.codigo.toUpperCase().trim();

    // Usamos una referencia temporal para no disparar múltiples re-renderizados
    const result = this.properties.filter(property => {
      const estadoActual = property.Estado?.toLowerCase().trim() || '';
      
      // LÓGICA DE OCULTAMIENTO REFORZADA:
      const estadosInactivos = ['vendido', 'vendida', 'comprada', 'comprado', 'rentado', 'rentada'];
      
      // Si no hay una búsqueda específica por código, ocultamos estados inactivos
      if (!filtroCodigo) {
        if (estadosInactivos.includes(estadoActual)) {
          return false;
        }
      }

      const estadoMatch = !this.showSidebar || (!filtroEstado || (estadoActual === filtroEstado));
      const ciudadMatch = !this.showSidebar || (!filtroCiudad || (property.CIUDAD === filtroCiudad));
      const codigoMatch = !this.showSidebar || (!filtroCodigo || (property.IPD.toUpperCase().trim().includes(filtroCodigo)));

      if (!(estadoMatch && ciudadMatch && codigoMatch)) return false;
      
      // Filtros Avanzados
      if (this.showAdvanced) {
        const precioStr = property.Precio_Venta?.toString().replace(/[^0-9.]/g, '') || '0';
        const precio = parseFloat(precioStr);
        const habs = parseInt(property.HAB || '0');
        const banos = parseInt(property.BNO || '0');
        const area = parseFloat(property.AreaCons || '0');

        if (this.minPrice !== null && precio < this.minPrice) return false;
        if (this.maxPrice !== null && precio > this.maxPrice) return false;
        if (this.minRooms !== null && habs < this.minRooms) return false;
        if (this.minBaths !== null && banos < this.minBaths) return false;
        if (this.minArea !== null && area < this.minArea) return false;
      }

      let categoryMatch = false;
      if (!this.activeMainCategory) {
        categoryMatch = true;
      } else if (this.activeMainCategory === 'Proyectos') {
        categoryMatch = property.TipoPropiedad.toLowerCase().includes('proyecto');
      } else if (this.activeSubCategory) {
        categoryMatch = property.TipoPropiedad === this.activeSubCategory;
      } else {
        const group = this.categoryGroups.find(g => g.name === this.activeMainCategory);
        categoryMatch = group ? group.types.includes(property.TipoPropiedad) : false;
      }

      return categoryMatch;
    });

    this.filteredProperties = result;
  }

  createWhatsappLink(property: Property): string {
    const message = `¡Hola! Me interesa la propiedad en ${property.TipoPropiedad} con el codigo${property.IPD}. Ubicada en el sector: ${property.Direccion_Sector}. `;
    return `https://wa.me/593998683511?text=${encodeURIComponent(message)}`;
  }

  openPropertyDetail(id: string): void {
    this.selectedPropertyId = id;
    this.selectedProperty = this.properties.find(p => p.IPD === id) || null;
    document.body.style.overflow = 'hidden';
  }

  closePropertyDetail(): void {
    this.selectedPropertyId = null;
    this.selectedProperty = null;
    document.body.style.overflow = 'auto';
  }

  previousImage(property: DisplayProperty, event: MouseEvent) {
    event.stopPropagation();
    if (!property.imagenes || property.imagenes.length <= 1) return;
    property._currentImageIndex = ((property._currentImageIndex || 0) - 1 + property.imagenes.length) % property.imagenes.length;
  }

  nextImage(property: DisplayProperty, event: MouseEvent) {
    event.stopPropagation();
    if (!property.imagenes || property.imagenes.length <= 1) return;
    property._currentImageIndex = ((property._currentImageIndex || 0) + 1) % property.imagenes.length;
  }

  clearFilters() {
    this.propertyType = '';
    this.city = '';
    this.estado = '';
    this.codigo = '';
    
    // Reset Avanzados
    this.minPrice = null;
    this.maxPrice = null;
    this.minRooms = null;
    this.minBaths = null;
    this.minArea = null;
    
    this.activeMainCategory = null;
    this.activeSubCategory = null;
    this.subCategories = [];
    this.showSidebar = true;

    this.filterProperties();
  }

  toggleAdvanced() {
    this.showAdvanced = !this.showAdvanced;
    if (!this.showAdvanced) {
      this.minPrice = null;
      this.maxPrice = null;
      this.minRooms = null;
      this.minBaths = null;
      this.minArea = null;
      this.filterProperties();
    }
  }

  onCityChange(city: string) {
    this.city = city;
    this.filterProperties();
  }

  limpiarTextoTipo(tipo: string): string {
    return tipo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').replace(/[0-9]+/g, '').replace(/M2|M²|M\^2/g, '').replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 900;
  }
}
