import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling, withPreloading, PreloadAllModules, withViewTransitions } from '@angular/router';

import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage'; // Importar Firebase Storage

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }), 
    provideRouter(
      routes, 
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled' }),
      withPreloading(PreloadAllModules), // Descarga el código de otras páginas en silencio
      withViewTransitions() // Animación fluida entre cambios de vista
    ),
    provideFirebaseApp(() => initializeApp({
      projectId: "finalinmobiliaria",
      appId: "1:961419030404:web:51f12231b7121f9f2577d1",
      apiKey: "AIzaSyCQOl7UQEncSw_aAoZINPCxM-6VVb8SY3A",
      storageBucket: "finalinmobiliaria.firebasestorage.app",
      authDomain: "finalinmobiliaria.firebaseapp.com",
      messagingSenderId: "961419030404",
      measurementId: "G-CCDE50PM7L"
    })),
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore()),
    provideStorage(() => getStorage())
  ]
};
