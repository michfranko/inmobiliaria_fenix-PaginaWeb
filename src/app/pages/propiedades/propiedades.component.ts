import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PropertyService } from '../../services/property.service';
import { Property } from '../../models/property';

@Component({
  selector: 'app-propiedades',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './propiedades.component.html',
  styleUrl: './propiedades.component.css'
})
export class PropiedadesComponent implements OnInit {
  properties: Property[] = [];

  constructor(private propertyService: PropertyService) {}

  ngOnInit(): void {
    this.propertyService.getPropiedades().subscribe((data) => {
      this.properties = data;
    });
  }

  createWhatsappLink(property: Property): string {
    const message = `¡Hola! Me interesa la propiedad: ${property.TipoPropiedad} (Cod: ${property.IPD})`;
    return `https://wa.me/593998683511?text=${encodeURIComponent(message)}`;
  }
}
