import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from './services/auth.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private authService: AuthService, private router: Router) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean> | Promise<boolean> | boolean {
    return new Observable<boolean>((observer) => {
      this.authService.authState$.subscribe((user) => {
        if (user) {
          // Verificar si el usuario tiene el rol de admin
          this.authService.checkUserRole(user.uid).then((isAdmin) => {
            if (isAdmin) {
              observer.next(true);
            } else {
              observer.next(false); // Usuario no autorizado
              this.router.navigate(['/home']); // Redirigir si no es admin
            }
          });
        } else {
          observer.next(false);
          this.router.navigate(['/home']); // Redirigir si no está logueado
        }
      });
    });
  }
}
