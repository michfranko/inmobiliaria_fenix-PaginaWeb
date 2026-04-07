import { Component, HostListener} from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { Router } from '@angular/router';
import { Property } from '../app/models/property';
import { CommonModule } from '@angular/common'; 
import { LoginModalComponent } from './login-modal/login-modal.component'; 
import { AuthService } from './services/auth.service';
import { FooterComponent } from './components/footer/footer.component';
import { HeaderComponent } from './components/header/header.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, RouterModule, LoginModalComponent, CommonModule, FooterComponent, HeaderComponent],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'inmobiliariafenix';
  showLoginModal: boolean = false;

  constructor(private router: Router) {}

  get mostrarFooter(): boolean {
    return this.router.url !== '/acercade';
  }

  get esHome(): boolean {
    // Retorna true si la ruta es /home o la raíz
    return this.router.url === '/home' || this.router.url === '/';
  }

  openLoginModal() {
    this.showLoginModal = true;
  }
  
  closeLoginModal() {
    this.showLoginModal = false;
  }
}
