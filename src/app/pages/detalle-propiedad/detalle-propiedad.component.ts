import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Property } from '../../models/property';
import { PropertyService } from '../../services/property.service';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  standalone: true,
  imports: [CommonModule, RouterModule],
  selector: 'app-detalle-propiedad',
  templateUrl: './detalle-propiedad.component.html',
  styleUrls: ['./detalle-propiedad.component.css']
})
export class DetallePropiedadComponent implements OnInit {
  @Input() propertyIdInput: string | null = null;
  @Input() propertyInput: Property | null = null;
  @Output() close = new EventEmitter<void>();
  
  property: Property | null = null;
  currentImageIndex: number = 0;

  constructor(
    private route: ActivatedRoute, 
    private propertyService: PropertyService,
    private location: Location,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit(): void {
    if (this.propertyInput) {
      this.property = this.propertyInput;
      this.precargarTodasLasImagenes(); // Iniciamos descarga masiva
      return;
    }

    if (this.propertyIdInput) {
      this.cargarPropiedad(this.propertyIdInput);
    } else {
      this.route.paramMap.subscribe(params => {
        const ipdCode = (params.get('id') || '').trim().toUpperCase();
        if (ipdCode) {
          this.cargarPropiedad(ipdCode);
        }
      });
    }
  }

  cargarPropiedad(ipdCode: string) {
    this.propertyService.getPropiedades().subscribe(properties => {
      const foundProperty = properties.find(p => (p.IPD || '').trim().toUpperCase() === ipdCode);
      if (foundProperty) {
        this.property = foundProperty;
        this.precargarTodasLasImagenes(); // Iniciamos descarga masiva
      }
    });
  }

  /** Descarga todas las imagenes a la cache del navegador inmediatamente */
  private precargarTodasLasImagenes() {
    if (this.property?.imagenes) {
      this.property.imagenes.forEach(url => {
        const img = new Image();
        img.src = url;
      });
      console.log('🚀 Iniciada precarga agresiva de todas las imagenes');
    }
  }

  goBack(): void {
    if (this.propertyIdInput) {
      this.close.emit();
    } else {
      this.location.back();
    }
  }

  createWhatsappLink(property: Property): string {
    const message = `¡Hola! Me interesa la propiedad en ${property.TipoPropiedad} con el código ${property.IPD}. Ubicada en el sector: ${property.Direccion_Sector}.`;
    return `https://wa.me/593998683511?text=${encodeURIComponent(message)}`;
  }

  compartirPagina() {
    const url = window.location.href;
    const texto = 'Mira esta propiedad que encontré en Inmobiliaria Fénix:';
  
    if (navigator.share) {
      navigator.share({
        title: 'Inmobiliaria Fénix',
        text: texto,
        url: url,
      }).catch((error) => console.error('Error al compartir:', error));
    } else {
       navigator.clipboard.writeText(url).then(() => alert('🔗 Enlace copiado al portapapeles'));
    }
  }
  
  previousImage(): void {
    if (!this.property?.imagenes || this.property.imagenes.length === 0) return;
    const newIndex = this.currentImageIndex - 1;
    this.currentImageIndex = newIndex < 0 ? this.property.imagenes.length - 1 : newIndex;
  }

  nextImage(): void {
    if (!this.property?.imagenes || this.property.imagenes.length === 0) return;
    const newIndex = this.currentImageIndex + 1;
    this.currentImageIndex = newIndex >= this.property.imagenes.length ? 0 : newIndex;
  }

  /**
   * Genera una URL segura para el iframe de Google Maps.
   */
  getSafeMapUrl(): SafeResourceUrl | null {
    if (!this.property?.LinkMapa) return null;
    return this.sanitizer.bypassSecurityTrustResourceUrl(this.property.LinkMapa.trim());
  }

  /**
   * Verifica si el link proporcionado es de tipo "embed" (apto para iframe).
   */
  esLinkEmbebible(): boolean {
    if (!this.property?.LinkMapa) return false;
    return this.property.LinkMapa.includes('google.com/maps/embed') || 
           this.property.LinkMapa.includes('google.com/maps/block');
  }
}
