import { Injectable } from '@angular/core';
import { inject } from '@angular/core';
import { Auth, authState, signInWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, getDoc } from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { User } from 'firebase/auth';

export interface Credential {
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private auth = inject(Auth);  // Usamos inject() en lugar de constructor
  private firestore = inject(Firestore);  // Inyectamos Firestore
  readonly authState$: Observable<User | null> = authState(this.auth);

logInWithEmailAndPassword(credential: Credential) {
  return signInWithEmailAndPassword(this.auth, credential.email, credential.password)
    .then(async (userCredential) => {
      const userId = userCredential.user.uid;
      console.log('✅ UID del usuario autenticado:', userId);  // Aquí aparece el UID real
      return await this.checkUserRole(userId);
    })
    .catch((error) => {
      console.error('❌ Error al autenticar con Firebase:', error);
      throw error;
    });
}

  
  // Verificar el rol del usuario en Firestore
  async checkUserRole(userId: string) {
    try {
      const userRef = doc(this.firestore, 'User', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        return userData && userData['rol'] === 'admin';
      }
      return false;
    } catch (e) {
      console.error("Error al verificar rol:", e);
      return false;
    }
  }

  getCurrentUser(): User | null {
    return this.auth.currentUser;
  }

  logOut() {
    return this.auth.signOut();
  }
}
