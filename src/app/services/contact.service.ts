import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc } from '@angular/fire/firestore';
import { Contact } from '../models/contact';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ContactService {
  private firestore = inject(Firestore);
  private readonly COLLECTION_NAME = 'contacts';
  private contactsCollection = collection(this.firestore, this.COLLECTION_NAME);

  constructor() {}

  private toTitleCase(text: string): string {
    if (!text) return '';
    return text.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  }

  async createContact(contact: Contact): Promise<string> {
    const formattedContact = {
      ...contact,
      nombres: this.toTitleCase(contact.nombres),
      apellidos: this.toTitleCase(contact.apellidos),
      codigo: this.generateContactCode(contact),
      propiedadesAsociadas: contact.propiedadesAsociadas || []
    };
    const docRef = await addDoc(this.contactsCollection, formattedContact);
    return docRef.id;
  }

  getContacts(): Observable<Contact[]> {
    return from(getDocs(this.contactsCollection)).pipe(
      map(snapshot => snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        propiedadesAsociadas: (doc.data() as any).propiedadesAsociadas || []
      } as Contact)))
    );
  }

  async updateContact(id: string, contact: Partial<Contact>): Promise<void> {
    const formattedData: any = { ...contact };
    if (contact.nombres) formattedData.nombres = this.toTitleCase(contact.nombres);
    if (contact.apellidos) formattedData.apellidos = this.toTitleCase(contact.apellidos);
    
    const contactRef = doc(this.firestore, this.COLLECTION_NAME, id);
    await updateDoc(contactRef, formattedData);
  }

  async deleteContact(id: string): Promise<void> {
    const contactRef = doc(this.firestore, this.COLLECTION_NAME, id);
    await deleteDoc(contactRef);
  }

async searchContactsByRole(role: 'propietario' | 'responsable' | 'inmobiliaria' | 'Terciario'): Promise<Contact[]> {
    const q = query(this.contactsCollection, where('rol', '==', role));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      propiedadesAsociadas: (doc.data() as any).propiedadesAsociadas || []
    } as Contact));
  }

  async hasContactWithRole(propertyId: string, role: string): Promise<boolean> {
    const q = query(
      this.contactsCollection,
      where('propiedadesAsociadas', 'array-contains', propertyId),
      where('rol', '==', role)
    );
    const snapshot = await getDocs(q);
    return !snapshot.empty;
  }

  private generateContactCode(contact: Contact): string {
    // Genera un código basado en el nombre y apellido
    const initials = contact.nombres.charAt(0) + contact.apellidos.charAt(0);
    const timestamp = Date.now().toString().slice(-4);
    return `${initials}${timestamp}`.toUpperCase();
  }
}