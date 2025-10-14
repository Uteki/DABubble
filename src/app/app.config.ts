import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { provideAuth, getAuth } from '@angular/fire/auth';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { registerLocaleData } from '@angular/common';
import localeDe from '@angular/common/locales/de';

registerLocaleData(localeDe);

const firebaseConfig = {
  apiKey: 'AIzaSyA8vBXNyJXnuSo0kMuHhpku5RPzxrlnUrg',
  authDomain: 'dabubble-430.firebaseapp.com',
  projectId: 'dabubble-430',
  storageBucket: 'dabubble-430.firebasestorage.app',
  messagingSenderId: '622898057323',
  appId: '1:622898057323:web:3a8dbe2fc24022c1f8e12e',
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    { provide: LOCALE_ID, useValue: 'de-DE' }
  ],
};
