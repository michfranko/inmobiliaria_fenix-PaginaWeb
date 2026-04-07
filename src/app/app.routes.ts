import { Routes } from '@angular/router';
import { AuthGuard } from './auth.guard'; 

export const routes: Routes = [
    {
      path: '',
      loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    },
    {
      path: 'home',
      loadComponent: () => import('./pages/home/home.component').then(m => m.HomeComponent),
    },
    {
      path: 'catalogo',
      loadComponent: () => import('./pages/catalogo/catalogo.component').then(m => m.CatalogoComponent),
    },
    {
      path: 'login',
      loadComponent: () => import('./pages/login/login.component').then(m => m.LoginComponent),
    },
    {
      path: 'detalle/:id',
      loadComponent: () => import('./pages/detalle-propiedad/detalle-propiedad.component').then(m => m.DetallePropiedadComponent),
    },
    {
      path: 'acercade',
      loadComponent: () => import('./pages/acercade/acercade.component').then(m => m.AcercadeComponent),
    },
    // Rutas de Administración (Protegidas)
    {
      path: 'seguimiento',
      loadComponent: () => import('./pages/seguimiento/seguimiento.component').then(m => m.SeguimientoComponent),
      canActivate: [AuthGuard],
    },
    {
      path: 'contactos',
      loadComponent: () => import('./pages/contactos/contactos.component').then(m => m.ContactosComponent),
      canActivate: [AuthGuard]
    },
    { 
      path: 'mantenimiento',
      loadComponent: () => import('./pages/mantenimiento/mantenimiento.component').then(m => m.MantenimientoComponent), 
      canActivate: [AuthGuard] 
    },
    { 
      path: 'propiedad/:id',
      loadComponent: () => import('./pages/propiedad/propiedad.component').then(m => m.PropiedadComponent), 
      canActivate: [AuthGuard] 
    },
    { 
      path: 'propiedad', 
      loadComponent: () => import('./pages/propiedad/propiedad.component').then(m => m.PropiedadComponent), 
      canActivate: [AuthGuard] 
    },
    {
      path: '**', // Ruta comodín por si escriben una url que no existe
      redirectTo: 'home'
    }
  ];