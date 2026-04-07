import { Injectable, inject , NgZone} from '@angular/core';
import { Firestore, collection, collectionData, deleteDoc, doc, docData, updateDoc, setDoc, addDoc } from '@angular/fire/firestore';
import { Storage, ref, listAll, getDownloadURL } from '@angular/fire/storage';
import { Observable, from, map, switchMap, shareReplay, of } from 'rxjs';
import { query, where, getDocs, DocumentReference } from 'firebase/firestore';
import { Property } from '../models/property';

@Injectable({ providedIn: 'root' })
export class PropertyService {
  private firestore = inject(Firestore);
  private storage = inject(Storage);
  private ngZone = inject(NgZone); 
  
  private propiedadesCollection = collection(this.firestore, 'Propiedades');
  private ciudadesCollection = collection(this.firestore, 'Ciudades');
  private propiedadesCache$: Observable<Property[]> | null = null;

  getCiudades(): Observable<string[]> {
    return collectionData(this.ciudadesCollection).pipe(
      map(docs => docs.map(d => (d as any).nombre).sort())
    );
  }

  agregarCiudad(nombre: string): Promise<void> {
    const docRef = doc(this.firestore, `Ciudades/${nombre.toLowerCase().replace(/\s+/g, '_')}`);
    return setDoc(docRef, { nombre });
  }

  getPropiedades(): Observable<Property[]> {
    if (!this.propiedadesCache$) {
      this.propiedadesCache$ = collectionData(this.propiedadesCollection, { idField: 'id' }).pipe(
        map(props => props as Property[]),
        shareReplay(1) // Guarda el último resultado en caché
      );
    }
    return this.propiedadesCache$;
  }

  // Método para forzar la actualización del caché si es necesario (ej: tras crear una propiedad)
  limpiarCache() {
    this.propiedadesCache$ = null;
  }

  getImagenesPropiedad(folderPath: string): Observable<string[]> {
    if (!folderPath) return from([[]]);
    const folderRef = ref(this.storage, folderPath);

    return from(listAll(folderRef)).pipe(
      switchMap(result => {
        const item = result.items[0];
        return item
          ? from(getDownloadURL(item)).pipe(map(url => [url]))
          : from([[]]);
      })
    );
  }


  getPropiedadPorId(id: string) {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return docData(docRef, { idField: 'id' }) as Observable<Property>;
  }
  
  actualizarPropiedad(id: string, data: any) {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return updateDoc(docRef, data);
  }  

  eliminarPropiedad(id: string) {
    // si usas Firestore
    return deleteDoc(doc(this.firestore, 'Propiedades', id));
  }


  actualizarImagenesPropiedad(id: string, nuevasImagenes: string[]) {
    const docRef = doc(this.firestore, 'Propiedades', id);
    return updateDoc(docRef, {
      imagenes: nuevasImagenes
    });
  }

  verificarCodigoExiste(codigo: string): Promise<boolean> {
    const codigoNormalizado = codigo.trim().toLowerCase();
    const consulta = query(this.propiedadesCollection, where('IPD', '==', codigoNormalizado));
    return getDocs(consulta).then(snapshot => !snapshot.empty);
  }

  
obtenerTodosLosCodigosIPD(): Promise<string[]> {
  return getDocs(this.propiedadesCollection).then(snapshot =>
    snapshot.docs.map(doc => (doc.data() as Property).IPD?.toLowerCase().trim()).filter(Boolean)
  );}



  crearPropiedad(property: Property): Promise<string> {
    // Añadimos ImagenFolder, LinkMapa y un arreglo vacío de imagenes por defecto
    const payload = {
      ...property,
      ImagenFolder: `imagenes_propiedades/${property.IPD}`,
      LinkMapa: property.LinkMapa ?? '',
      imagenes: property.imagenes ?? []
    } as any;

    return addDoc(this.propiedadesCollection, payload).then((docRef: DocumentReference) => docRef.id);
  }

  getAllProperties(): Observable<Property[]> {
    return collectionData(this.propiedadesCollection, { idField: 'id' }) as Observable<Property[]>;
  }
}
