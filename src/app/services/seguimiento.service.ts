import { Injectable, inject, NgZone } from '@angular/core';
import { Firestore, collection, collectionData, deleteDoc, doc, docData, updateDoc } from '@angular/fire/firestore';
import { Storage, ref, listAll, getDownloadURL } from '@angular/fire/storage';
import { addDoc, getDocs, query, where } from 'firebase/firestore';
import { Observable, from, map, switchMap } from 'rxjs';
import { Cliente } from '../models/cliente';
import { Property } from '../models/property';
import { Seguimiento } from '../models/seguimiento';

@Injectable({ providedIn: 'root' })
export class SeguimientoService {
  private firestore = inject(Firestore);

  // 🔹 --- CLIENTES --- 🔹
  crearCliente(cliente: Cliente): Promise<void> {
    const clientesRef = collection(this.firestore, 'Clientes');
    return addDoc(clientesRef, cliente).then(() => {});
  }

  obtenerClientes(): Observable<Cliente[]> {
    const clientesRef = collection(this.firestore, 'Clientes');
    return collectionData(clientesRef, { idField: 'id' }) as Observable<Cliente[]>;
  }

  // 🔹 --- SEGUIMIENTOS --- 🔹
  crearSeguimiento(seg: Seguimiento): Promise<void> {
    const seguimientoRef = collection(this.firestore, 'Seguimientos');
    return addDoc(seguimientoRef, seg).then(() => {});
  }

  obtenerSeguimientos(): Observable<Seguimiento[]> {
    const seguimientoRef = collection(this.firestore, 'Seguimientos');
    return collectionData(seguimientoRef, { idField: 'id' }) as Observable<Seguimiento[]>;
  }

  eliminarSeguimiento(id: string): Promise<void> {
    const docRef = doc(this.firestore, 'Seguimientos', id);
    return deleteDoc(docRef);
  }

  actualizarSeguimiento(id: string, data: Partial<Seguimiento>): Promise<void> {
    const docRef = doc(this.firestore, 'Seguimientos', id);
    return updateDoc(docRef, data);
  }

  obtenerTodosLosCodigosIPD(): Promise<string[]> {
    const propiedadesRef = collection(this.firestore, 'Propiedades');
    return getDocs(propiedadesRef).then(snapshot =>
      snapshot.docs
        .map(doc => (doc.data() as Property).IPD?.toLowerCase().trim())
        .filter(Boolean)
    );
  }
  
}
