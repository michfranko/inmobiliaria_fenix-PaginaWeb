import { Component, HostListener, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {
  isLoggedIn = false;
  dropdownAbierto = false;
  menuAbierto = false;

  constructor(private router: Router, private authService: AuthService) {
    this.authService.authState$.subscribe(user => {
      this.isLoggedIn = !!user;
    });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.dropdown')) {
      this.dropdownAbierto = false;
    }
  }

  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  goToInicio() {
    this.router.navigateByUrl('/home');
    this.menuAbierto = false;
  }

  cerrarSesion() {
    this.authService.logOut();
    this.router.navigateByUrl('/home');
    this.menuAbierto = false;
  }
}
