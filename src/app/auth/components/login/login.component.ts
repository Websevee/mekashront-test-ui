import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { ErrorResponse } from '../../models/error-response.model';
import { LoginResponse } from '../../models/login-response.model';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  error = '';
  successMessage = '';

  constructor(
    public formBuilder: FormBuilder,
    public authService: AuthService,
    public router: Router
  ) { }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit() {
    this.submitted = true;
    if (this.loginForm.invalid) {
      return;
    }

    const { username, password } = this.loginForm.value;

    this.login(username, password);
  }

  private login(username: string, password: string) {
    // Clear previous messages before new login attempt
    this.error = '';
    this.successMessage = '';
    this.authService.loginSoap(username, password)
      .subscribe({
        next: (response) => {
          // Проверяем тип response и применяем соответствующую логику
          if (this.isLoginResponse(response)) {
            this.handleLoginSuccess(response);
          } else if (this.isErrorResponse(response)) {
            this.handleError(response);
          } else if (response === null) {
            this.handleNullResponse();
          } else {
            this.handleUnexpectedResponse(response);
          }
        },
        error: (err) => {
          this.error = 'Login error. Please try again.';
          console.error('Login HTTP error:', err);
        }
      });
  }

  /**
   * Проверяет, является ли объект LoginResponse
   */
  private isLoginResponse(obj: any): obj is LoginResponse {
    return obj && typeof obj === 'object' && 'EntityId' in obj && typeof obj.EntityId === 'number';
  }

  /**
   * Проверяет, является ли объект ErrorResponse
   */
  private isErrorResponse(obj: any): obj is ErrorResponse {
    return obj && typeof obj === 'object' && 'ResultCode' in obj && typeof obj.ResultCode === 'number';
  }

  /**
   * Обрабатывает успешный ответ LoginResponse
   */
  private handleLoginSuccess(response: LoginResponse): void {
    console.log('Login successful:', response);
    this.successMessage = `Welcome, ${response.FirstName} ${response.LastName}. You have successfully logged in!`;
    // Здесь можно добавить дополнительную логику после успешного логина
    // Например, сохранение пользователя в AuthService или перенаправление
  }

  /**
   * Обрабатывает ошибку ErrorResponse
   */
  private handleError(response: ErrorResponse): void {
    console.log('Login error:', response);
    if (response.ResultMessage === 'User not found') {
      this.error = 'Invalid username or password';
    } else {
      this.error = response.ResultMessage;
    }
  }

  /**
   * Обрабатывает null response
   */
  private handleNullResponse(): void {
    this.error = 'Invalid username or password';
  }

  /**
   * Обрабатывает неожиданный тип response
   */
  private handleUnexpectedResponse(response: any): void {
    this.error = 'Unexpected response format';
    console.error('Unexpected response type:', response);
  }
}
