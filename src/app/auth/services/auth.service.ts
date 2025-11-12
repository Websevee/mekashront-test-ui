import { Injectable } from '@angular/core';
import { BehaviorSubject, map, Observable, of } from 'rxjs';
import { User } from '../models/user.model';
import { SoapService } from '../../core/services/soap.service';
import { LoginResponse } from '../models/login-response.model';
import { ErrorResponse } from '../models/error-response.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser = this.currentUserSubject.asObservable();

  private isLoggedInSubject = new BehaviorSubject<boolean>(false);
  public isLoggedIn = this.isLoggedInSubject.asObservable();

  constructor(private readonly soapService: SoapService) {
    // Check if there is a saved user in localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      this.currentUserSubject.next(user);
      this.isLoggedInSubject.next(true);
    }
  }

  register(user: User): Observable<boolean> {
    // In a real application, there will be an HTTP request to the server here
    // For demonstration, we just save the user to localStorage
    localStorage.setItem('currentUser', JSON.stringify(user));
    this.currentUserSubject.next(user);
    this.isLoggedInSubject.next(true);
    return of(true);
  }

  login(username: string, password: string): Observable<User | null> {
    // In a real application, there will be an HTTP request to the server here
    // For demonstration, we check the data from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      const user = JSON.parse(savedUser);
      if (user.username === username && user.password === password) {
        this.currentUserSubject.next(user);
        this.isLoggedInSubject.next(true);
        return of(user);
      }
    }
    return of(null);
  }

  loginSoap(username: string, password: string): Observable<LoginResponse | ErrorResponse | null> {
    const params = {
      method: 'Login',
      parameters: {
        UserName: username,
        Password: password
      }
    };

    return this.soapService.callSoapMethod<string>(params)
      .pipe(
        map(response => {
          if (response.success && response.data) {
            try {
              return this.soapService.extractJsonFromSoapResponse(response.data);
            } catch (error) {
              console.error('Ошибка парсинга ответа:', error);
              return null;
            }
          }
          return null;
        })
      );
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    this.currentUserSubject.next(null);
    this.isLoggedInSubject.next(false);
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }
}
