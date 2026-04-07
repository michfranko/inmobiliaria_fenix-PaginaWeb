import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgOptimizedImage } from '@angular/common';
import { Property } from '../../models/property';

type DisplayProperty = Property & { _currentImageIndex?: number };

@Component({
  selector: 'app-property-card',
  standalone: true,
  imports: [CommonModule, NgOptimizedImage],
  templateUrl: './property-card.component.html',
  styleUrl: './property-card.component.css'
})
export class PropertyCardComponent {
  @Input() property!: DisplayProperty;
  @Input() priority: boolean = false;
  @Output() viewDetail = new EventEmitter<string>();

  previousImage(event: MouseEvent) {
    event.stopPropagation();
    if (!this.property.imagenes || this.property.imagenes.length <= 1) return;
    this.property._currentImageIndex = ((this.property._currentImageIndex || 0) - 1 + this.property.imagenes.length) % this.property.imagenes.length;
  }

  nextImage(event: MouseEvent) {
    event.stopPropagation();
    if (!this.property.imagenes || this.property.imagenes.length <= 1) return;
    this.property._currentImageIndex = ((this.property._currentImageIndex || 0) + 1) % this.property.imagenes.length;
  }

  onViewDetail() {
    this.viewDetail.emit(this.property.IPD);
  }

  createWhatsappLink(): string {
    const message = `¡Hola! Me interesa la propiedad en ${this.property.TipoPropiedad} con el código ${this.property.IPD}. Ubicada en el sector: ${this.property.Direccion_Sector}.`;
    return `https://wa.me/593998683511?text=${encodeURIComponent(message)}`;
  }
}
