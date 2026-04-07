import { Component, AfterViewInit, ViewChild, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { RouterOutlet } from '@angular/router';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Property } from '../../models/property';
import { PropertyService } from '../../services/property.service';
import { DetallePropiedadComponent } from '../detalle-propiedad/detalle-propiedad.component';
import { PropertyCardComponent } from '../../components/property-card/property-card.component';

type DisplayProperty = Property & { _currentImageIndex?: number };

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, DetallePropiedadComponent, PropertyCardComponent],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit {
  allFeaturedProperties: DisplayProperty[] = [];
  displayProperties: DisplayProperty[] = [];
  activeStatus: string = 'VENTA';
  
  selectedPropertyId: string | null = null;
  selectedProperty: Property | null = null;
  isMobile: boolean = false;
  loadVideo: boolean = false; // Control de carga de video

  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  constructor(private propertyService: PropertyService, private router: Router) {
    this.checkScreenSize();
  }

  ngOnInit(): void {
    window.addEventListener('resize', () => this.checkScreenSize());
    
    // Diferir la carga del video 2 segundos para dar prioridad al renderizado
    setTimeout(() => {
      this.loadVideo = true;
    }, 2000);

    this.propertyService.getPropiedades().subscribe((properties) => {
      this.allFeaturedProperties = properties
        .filter(p => Array.isArray(p.imagenes) && p.imagenes.length > 0)
        .map((p): DisplayProperty => ({ 
          ...p, 
          _currentImageIndex: 0,
          TipoPropiedad: this.limpiarTextoTipo(p.TipoPropiedad || '')
        }));

      this.setStatus('VENTA');
    });
  }

  private checkScreenSize() {
    this.isMobile = window.innerWidth <= 900;
  }

  setStatus(status: string): void {
    this.activeStatus = status;
    const filtered = this.allFeaturedProperties.filter(p => 
      p.Estado?.toUpperCase().includes(status.toUpperCase())
    );
    this.displayProperties = this.getRandomProperties(filtered, 6);
  }

  limpiarTextoTipo(tipo: string): string {
    return tipo.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').replace(/[0-9]+/g, '').replace(/M2|M²|M\^2/g, '').replace(/[^A-Z\s]/g, '').replace(/\s+/g, ' ').trim();
  }

  createWhatsappLink(property: Property): string {
    const message = `¡Hola! Me interesa la propiedad en ${property.TipoPropiedad} con el código ${property.IPD}. Ubicada en el sector: ${property.Direccion_Sector}.`;
    return `https://wa.me/593998683511?text=${encodeURIComponent(message)}`;
  }

  goToCatalogo(type?: string): void {
    if (type) {
      this.router.navigate(['/catalogo'], { queryParams: { propertyType: type } });
    } else {
      this.router.navigateByUrl('/catalogo');
    }
  }

  ngAfterViewInit() {
    if (!this.isMobile && this.videoPlayer && this.videoPlayer.nativeElement) {
      this.videoPlayer.nativeElement.muted = true;
      this.videoPlayer.nativeElement.volume = 0;
    }
  }

  getRandomProperties(properties: any[], num: number): any[] {
    const shuffled = [...properties].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, num);
  }

  openPropertyDetail(id: string): void {
    this.selectedPropertyId = id;
    this.selectedProperty = this.allFeaturedProperties.find(p => p.IPD === id) || null;
    document.body.style.overflow = 'hidden';
  }

  closePropertyDetail(): void {
    this.selectedPropertyId = null;
    this.selectedProperty = null;
    document.body.style.overflow = 'auto';
  }
}
