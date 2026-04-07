import { Component, Output, EventEmitter  } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { FormsModule } from '@angular/forms';  // Importa FormsModule
import { Router } from '@angular/router';

@Component({
  selector: 'app-login-modal',
  standalone: true,
  imports: [
    FormsModule  // Asegúrate de incluir FormsModule aquí
  ],
  templateUrl: './login-modal.component.html',
  styleUrls: ['./login-modal.component.css']
})
export class LoginModalComponent {
  email: string = '';
  password: string = '';
    // Output para enviar el evento al componente padre (cerrar modal)
    @Output() close = new EventEmitter<void>();

  constructor(private authService: AuthService, private router: Router) {}

  login() {
    if (this.email && this.password) {
      this.authService.logInWithEmailAndPassword({ email: this.email, password: this.password })
        .then((isAdmin) => {
          if (isAdmin) {
            alert('✅ Ingreso exitoso');
            this.close.emit();
            // Si es admin, redirigir al panel de administración
            this.router.navigate(['/mantenimiento']);
          } else {
            // Si no es admin, redirigir a la página de inicio
            this.router.navigate(['/home']);
          }
        })
        .catch((error) => {
          console.error('Error de login:', error);
          alert(error.message);
        });
    } else {
      alert('Por favor ingrese los datos');
    }}

  closeModal(event: MouseEvent) {
    const modalContent = document.querySelector('.modal-content');
    if (!modalContent?.contains(event.target as Node)) {
      this.close.emit();  // Emitir el evento de cierre
    }
  }

  stopPropagation(event: MouseEvent) {
    event.stopPropagation();  // Evitar que el clic dentro del modal cierre el modal
  }

  
}
