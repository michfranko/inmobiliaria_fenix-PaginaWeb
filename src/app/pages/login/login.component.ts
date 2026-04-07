import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  isLoading = false;

  constructor(private authService: AuthService, private router: Router) {}

  async onLogin() {
    if (!this.email || !this.password) {
      this.error = 'Por favor, ingrese sus credenciales.';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      await this.authService.logInWithEmailAndPassword({ email: this.email, password: this.password });
      this.router.navigate(['/mantenimiento']);
    } catch (err: any) {
      this.error = 'Credenciales incorrectas. Intente de nuevo.';
      console.error(err);
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/home']);
  }
}
